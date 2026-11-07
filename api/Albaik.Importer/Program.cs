namespace Albaik.Importer;

internal static class Program
{
    private static async Task<int> Main(string[] args)
    {
        if (args.Length == 0 || args.Contains("--help") || args.Contains("-h"))
        {
            PrintUsage();
            return args.Length == 0 ? 2 : 0;
        }

        string? sourcePath = null;
        string? targetConnectionString = Environment.GetEnvironmentVariable("ConnectionStrings__Default");
        var force = false;
        var migrate = false;

        for (var index = 0; index < args.Length; index++)
        {
            switch (args[index])
            {
                case "--source":
                    if (++index >= args.Length)
                    {
                        Console.Error.WriteLine("--source needs a file path.");
                        return 2;
                    }

                    sourcePath = args[index];
                    break;

                case "--target":
                    if (++index >= args.Length)
                    {
                        Console.Error.WriteLine("--target needs a MariaDB connection string.");
                        return 2;
                    }

                    targetConnectionString = args[index];
                    break;

                case "--force":
                    force = true;
                    break;

                case "--migrate":
                    migrate = true;
                    break;

                default:
                    Console.Error.WriteLine($"Unknown argument '{args[index]}'.");
                    PrintUsage();
                    return 2;
            }
        }

        if (string.IsNullOrWhiteSpace(sourcePath))
        {
            Console.Error.WriteLine("--source is required.");
            PrintUsage();
            return 2;
        }

        if (Directory.Exists(sourcePath))
        {
            Console.Error.WriteLine($"--source '{sourcePath}' is a directory; pass the SQLite file itself.");
            return 2;
        }

        if (!File.Exists(sourcePath))
        {
            Console.Error.WriteLine($"--source '{sourcePath}' does not exist.");
            return 2;
        }

        if (string.IsNullOrWhiteSpace(targetConnectionString))
        {
            Console.Error.WriteLine(
                "No target connection. Pass --target or set the ConnectionStrings__Default environment variable.");
            PrintUsage();
            return 2;
        }

        try
        {
            var report = await SqliteToMariaDbImporter.RunAsync(
                new ImportOptions
                {
                    SourcePath = sourcePath,
                    TargetConnectionString = targetConnectionString,
                    Force = force,
                    ApplyMigrations = migrate,
                },
                Console.WriteLine);

            Console.WriteLine();
            Console.WriteLine("Import complete.");

            foreach (var table in report.Tables)
            {
                Console.WriteLine(
                    $"{table.Table,-16} {table.SourceRows,6} rows  sha256 {table.SourceChecksum}");
            }

            Console.WriteLine(
                $"Verification codes checked: {report.VerificationCodesChecked}. "
                + "All row counts and content checksums match.");

            return 0;
        }
        catch (ImportRefusedException error)
        {
            Console.Error.WriteLine(error.Message);
            return 2;
        }
        catch (Exception error)
        {
            Console.Error.WriteLine(error);
            return 1;
        }
    }

    private static void PrintUsage()
    {
        Console.Error.WriteLine(
            """
            Albaik SQLite -> MariaDB importer (one-off, not part of the API)

            Usage:
              dotnet run --project api/Albaik.Importer -- --source <albaik.db> [options]

            Options:
              --source <path>     Copy of the live SQLite file. The original is never written.
              --target <conn>     MariaDB connection string. Defaults to ConnectionStrings__Default.
              --migrate           Apply the API's EF migrations before importing.
              --force             Replace the imported tables' content instead of refusing a non-empty target.
              -h, --help          Show this help.

            Exit codes:
              0  imported, row counts and content checksums verified
              1  import or verification failed
              2  refused, because the target was not empty (re-run with --force) or arguments were invalid

            Example:
              dotnet run --project api/Albaik.Importer -- \
                --source C:\backup\albaik.db \
                --target "Server=127.0.0.1;Port=3306;User=root;Password=;Database=albaik;CharSet=utf8mb4" \
                --migrate
            """);
    }
}
