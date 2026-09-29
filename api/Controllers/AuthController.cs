using Albaik.Api.Data;
using Albaik.Api.Dtos;
using Albaik.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Albaik.Api.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly ITokenService _tokens;
    private readonly ILogger<AuthController> _log;

    public AuthController(AppDbContext db, ITokenService tokens, ILogger<AuthController> log)
    {
        _db = db;
        _tokens = tokens;
        _log = log;
    }

    [HttpPost("login")]
    public async Task<ActionResult<LoginResultDto>> Login([FromBody] LoginInput input)
    {
        if (string.IsNullOrWhiteSpace(input.Username) || string.IsNullOrWhiteSpace(input.Password))
            return BadRequest(new { message = "Username and password are required." });

        var user = await _db.AdminUsers.FirstOrDefaultAsync(u => u.Username == input.Username.Trim());
        if (user is null || !user.IsActive || !BCrypt.Net.BCrypt.Verify(input.Password, user.PasswordHash))
        {
            _log.LogWarning("Failed admin login attempt for '{Username}'.", input.Username);
            return Unauthorized(new { message = "Incorrect username or password." });
        }

        user.LastLoginAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        var (token, expires) = _tokens.Create(user);
        return new LoginResultDto { Token = token, ExpiresAt = expires, User = user.ToDto() };
    }

    [HttpGet("me")]
    [Authorize]
    public async Task<ActionResult<AdminUserDto>> Me()
    {
        var id = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        if (!int.TryParse(id, out var userId)) return Unauthorized();

        var user = await _db.AdminUsers.FindAsync(userId);
        return user is null ? Unauthorized() : user.ToDto();
    }

    [HttpPost("change-password")]
    [Authorize]
    public async Task<ActionResult<object>> ChangePassword([FromBody] ChangePasswordInput input)
    {
        var id = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        if (!int.TryParse(id, out var userId)) return Unauthorized();

        var user = await _db.AdminUsers.FindAsync(userId);
        if (user is null) return Unauthorized();

        if (!BCrypt.Net.BCrypt.Verify(input.CurrentPassword, user.PasswordHash))
            return BadRequest(new { message = "Your current password is incorrect." });

        if (string.IsNullOrWhiteSpace(input.NewPassword) || input.NewPassword.Length < 8)
            return BadRequest(new { message = "The new password must be at least 8 characters long." });

        user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(input.NewPassword);
        await _db.SaveChangesAsync();
        return Ok(new { message = "Password updated." });
    }
}
