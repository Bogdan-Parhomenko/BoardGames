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

        return new LoginResponse
        {
            UserId = user.UserId,
            Login = user.Login,
            FullName = user.FullName
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
            if (!string.IsNullOrWhiteSpace(request.FullName))
                user.FullName = request.FullName.Trim();

            user.City = string.IsNullOrWhiteSpace(request.City) ? null : request.City.Trim();
            user.Photo = string.IsNullOrWhiteSpace(request.Photo) ? null : request.Photo.Trim();
        }

        await _db.SaveChangesAsync();

        return new LoginResponse
        {
            UserId = user.UserId,
            Login = user.Login,
            FullName = user.FullName
        };
    }
}