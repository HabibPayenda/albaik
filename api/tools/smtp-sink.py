#!/usr/bin/env python3
"""
A throwaway SMTP server for verifying that the contact form's email path works,
before a real mail provider is configured.

Why this exists: the site is required to send a notification and an auto-reply when
someone submits the contact form. Until an operator supplies real SMTP credentials
(`Smtp:*` in appsettings.json) that path is never exercised, so a broken template or
a wrong recipient would only be discovered in production.

Run it, point the API at it, submit the form, and read what actually arrived.

    # terminal 1 — start the sink
    python api/tools/smtp-sink.py

    # terminal 2 — start the API pointed at the sink
    Smtp__Host=127.0.0.1 Smtp__Port=2525 Smtp__UseStartTls=false \
    Smtp__NotifyAddress=inbox@albaik-group.com \
    dotnet run --urls http://localhost:5080

Then submit the contact form and watch terminal 1. Each message is also written to
`tools/captured-mail/` as a .eml file you can open in any mail client.

Standard library only — no pip install. Speaks just enough SMTP for MailKit:
EHLO, MAIL FROM, RCPT TO, DATA, QUIT, RSET. It deliberately does NOT advertise
STARTTLS or AUTH, so `SecureSocketOptions.Auto` falls back to a plain connection.
"""

from __future__ import annotations

import argparse
import html as htmllib
import re
import socket
import threading
from datetime import datetime
from email import message_from_bytes
from email.header import decode_header, make_header
from pathlib import Path

# Deliberately absent: STARTTLS and AUTH. MailKit's `Auto` then negotiates plaintext,
# which is what a local sink wants. Advertising STARTTLS would make it try to upgrade
# and fail the handshake.
CAPABILITIES = ["SIZE 10485760", "8BITMIME", "SMTPUTF8"]


def log(prefix: str, text: str = "") -> None:
    stamp = datetime.now().strftime("%H:%M:%S")
    print(f"[{stamp}] {prefix}{text}", flush=True)


def summarise(raw: bytes) -> None:
    """
    Print the headers that matter, so a human can eyeball the result.

    Headers arrive RFC 2047-encoded (`=?utf-8?b?...?=`) whenever a subject contains a
    non-ASCII character such as an em dash, and HTML bodies arrive full of entities.
    Decoding both here matters: printing them raw makes correct mail look broken, and a
    verification tool that cries wolf is worse than none.
    """
    msg = message_from_bytes(raw)

    def header(name: str) -> str:
        value = msg.get(name)
        if value is None:
            return ""
        return str(make_header(decode_header(value)))

    parts = [p.get_content_type() for p in msg.walk() if not p.is_multipart()]

    body = ""
    for part in msg.walk():
        if part.get_content_type() == "text/plain":
            body = part.get_payload(decode=True).decode("utf-8", "replace")
            break
    if not body:
        for part in msg.walk():
            if part.get_content_type() == "text/html":
                markup = part.get_payload(decode=True).decode("utf-8", "replace")
                body = htmllib.unescape(re.sub(r"<[^>]+>", " ", markup))
                body = re.sub(r"\s+", " ", body).strip()
                break

    log("  From:    ", header("From"))
    log("  To:      ", header("To"))
    log("  Reply-To:", header("Reply-To"))
    log("  Subject: ", header("Subject"))
    log("  Parts:   ", ", ".join(parts) if parts else "(none)")
    if "text/plain" not in parts:
        log("  WARNING: ", "no text/plain alternative — text-only clients see nothing "
                           "and spam filters score it worse.")
    log("  Body:    ", body[:400] + ("…" if len(body) > 400 else ""))


def handle(conn: socket.socket, addr: tuple, outdir: Path) -> None:
    log("CONNECT  ", f"from {addr[0]}:{addr[1]}")
    stream = conn.makefile("rwb")

    def send(line: str) -> None:
        stream.write((line + "\r\n").encode("utf-8"))
        stream.flush()

    send("220 smtp-sink ready")

    sender = ""
    recipients: list[str] = []
    in_data = False
    chunks: list[str] = []

    try:
        while True:
            raw = stream.readline()
            if not raw:
                break
            line = raw.decode("utf-8", "replace").rstrip("\r\n")

            if in_data:
                if line == ".":
                    in_data = False
                    message = "\r\n".join(chunks)
                    # Undo dot-stuffing, per RFC 5321 §4.5.2.
                    message = re.sub(r"(?m)^\.\.", ".", message)
                    payload = message.encode("utf-8")

                    outdir.mkdir(parents=True, exist_ok=True)
                    name = datetime.now().strftime("%Y%m%d-%H%M%S-%f")
                    path = outdir / f"{name}.eml"
                    path.write_bytes(payload)

                    log("MESSAGE  ", f"{len(payload)} bytes -> {path.name}")
                    summarise(payload)
                    log("")
                    send("250 2.0.0 Ok: queued")
                    chunks = []
                else:
                    chunks.append(line)
                continue

            upper = line.upper()

            if upper.startswith("EHLO") or upper.startswith("HELO"):
                send("250-smtp-sink greets you")
                for i, cap in enumerate(CAPABILITIES):
                    sep = "250-" if i < len(CAPABILITIES) - 1 else "250 "
                    send(sep + cap)
            elif upper.startswith("MAIL FROM:"):
                sender = line[10:].strip()
                log("MAIL FROM", sender)
                send("250 2.1.0 Ok")
            elif upper.startswith("RCPT TO:"):
                recipients.append(line[8:].strip())
                log("RCPT TO  ", line[8:].strip())
                send("250 2.1.5 Ok")
            elif upper == "DATA":
                in_data = True
                chunks = []
                send("354 End data with <CR><LF>.<CR><LF>")
            elif upper == "RSET":
                sender, recipients, chunks, in_data = "", [], [], False
                send("250 2.0.0 Ok")
            elif upper == "QUIT":
                send("221 2.0.0 Bye")
                break
            elif upper == "NOOP":
                send("250 2.0.0 Ok")
            else:
                send("250 2.0.0 Ok")
    except (ConnectionError, OSError) as exc:
        log("ERROR    ", str(exc))
    finally:
        try:
            stream.close()
            conn.close()
        except OSError:
            pass
        log("CLOSE    ", f"{addr[0]}:{addr[1]}")


def main() -> None:
    parser = argparse.ArgumentParser(description="Local SMTP sink for email testing.")
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=2525)
    parser.add_argument(
        "--outdir",
        default=str(Path(__file__).resolve().parent / "captured-mail"),
        help="Where captured .eml files are written.",
    )
    args = parser.parse_args()

    outdir = Path(args.outdir)
    server = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    server.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    server.bind((args.host, args.port))
    server.listen(8)

    log("LISTEN   ", f"{args.host}:{args.port}  ->  {outdir}")
    log("         ", "Ctrl-C to stop.")
    log("")

    try:
        while True:
            conn, addr = server.accept()
            threading.Thread(target=handle, args=(conn, addr, outdir), daemon=True).start()
    except KeyboardInterrupt:
        log("", "stopped")
    finally:
        server.close()


if __name__ == "__main__":
    main()
