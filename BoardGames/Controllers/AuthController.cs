using BoardGamesApi.Data;
using BoardGamesApi.Models;
using BoardGamesApi.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace BoardGamesApi.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController : ControllerBase
{
    private readonly AppDbContext _db;

    public AuthController(AppDbContext db)
    {
        _db = db;
    }

    private async Task<string?> CheckUserBan(int userId)
    {
        var ban = await _db.UserBans
            .Where(b => b.UserId == userId && b.IsActive &&
                       (b.ExpiresAt == null || b.ExpiresAt > DateTime.UtcNow))
            .OrderByDescending(b => b.BannedAt)
            .FirstOrDefaultAsync();

        if (ban == null) return null;

        var expiryText = ban.ExpiresAt.HasValue
            ? $"до {ban.ExpiresAt.Value:dd.MM.yyyy HH:mm}"
            : "навсегда";

        return $"Ваш аккаунт заблокирован {expiryText}. Причина: {ban.Reason}";
    }

    [HttpPost("register")]
    public async Task<ActionResult<LoginResponse>> Register(RegisterRequest request)
    {
        if (await _db.Users.AnyAsync(u => u.Login == request.Login))
            return BadRequest("Пользователь с таким логином уже существует");

        var user = new User
        {
            Login = request.Login,
            PasswordHash = PasswordHelper.HashPassword(request.Password),
            FullName = request.FullName
        };

        _db.Users.Add(user);
        await _db.SaveChangesAsync();

        return new LoginResponse
        {
            UserId = user.UserId,
            Login = user.Login,
            FullName = user.FullName
        };
    }

    [HttpPost("login")]
    public async Task<ActionResult<LoginResponse>> Login(LoginRequest request)
    {
        var user = await _db.Users.FirstOrDefaultAsync(u => u.Login == request.Login);
        if (user == null)
            return Unauthorized("Неверный логин или пароль");

        if (!PasswordHelper.VerifyPassword(request.Password, user.PasswordHash))
            return Unauthorized("Неверный логин или пароль");

        var banMessage = await CheckUserBan(user.UserId);
        if (banMessage != null)
            return Unauthorized(banMessage);

        return new LoginResponse
        {
            UserId = user.UserId,
            Login = user.Login,
            FullName = user.FullName,
            Role = user.Role
        };
    }

    [HttpPost("vk-id-login")]
    public async Task<ActionResult<LoginResponse>> VkIdLogin(VkIdLoginRequest request)
    {
        if (request.VkUserId <= 0)
            return BadRequest("Некорректный VK ID");

        var user = await _db.Users.FirstOrDefaultAsync(u => u.VkId == request.VkUserId);

        if (user == null)
        {
            var baseLogin = $"vk_{request.VkUserId}";
            var login = baseLogin;
            var suffix = 1;

            while (await _db.Users.AnyAsync(u => u.Login == login))
            {
                login = $"{baseLogin}_{suffix}";
                suffix++;
            }

            user = new User
            {
                VkId = request.VkUserId,
                Login = login,
                PasswordHash = PasswordHelper.HashPassword(Guid.NewGuid().ToString()),
                FullName = string.IsNullOrWhiteSpace(request.FullName) ? login : request.FullName.Trim(),
                City = string.IsNullOrWhiteSpace(request.City) ? null : request.City.Trim(),
                Photo = string.IsNullOrWhiteSpace(request.Photo) ? null : request.Photo.Trim()
            };

            _db.Users.Add(user);
        }
        else
        {
            var banMessage = await CheckUserBan(user.UserId);
            if (banMessage != null)
                return Unauthorized(banMessage);

            if (!string.IsNullOrWhiteSpace(request.FullName))
                user.FullName = request.FullName.Trim();
            if (!string.IsNullOrWhiteSpace(request.City))
                user.City = request.City.Trim();
            if (!string.IsNullOrWhiteSpace(request.Photo))
                user.Photo = request.Photo.Trim();
        }

        await _db.SaveChangesAsync();

        return new LoginResponse
        {
            UserId = user.UserId,
            Login = user.Login,
            FullName = user.FullName,
            Role = user.Role
        };
    }

    [HttpGet("check-ban")]
    public async Task<IActionResult> CheckBan([FromQuery] int userId)
    {
        var banMessage = await CheckUserBan(userId);
        if (banMessage != null)
            return Unauthorized(banMessage);

        return Ok();
    }
}