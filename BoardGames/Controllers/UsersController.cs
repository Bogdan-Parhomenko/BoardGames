using BoardGamesApi.Data;
using BoardGamesApi.Models;
using BoardGamesApi.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace BoardGamesApi.Controllers;

[ApiController]
[Route("api/users")]
public class UsersController : ControllerBase
{
    private readonly AppDbContext _db;

    private readonly IWebHostEnvironment _env;

    public UsersController(AppDbContext db, IWebHostEnvironment env)
    {
        _db = db;
        _env = env;
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<UserProfileDto>> GetProfile(int id)
    {
        var user = await _db.Users.FindAsync(id);
        if (user == null) return NotFound();

        return new UserProfileDto
        {
            UserId = user.UserId,
            Login = user.Login,
            FullName = user.FullName,
            Description = user.Description,
            Phone = user.Phone,
            City = user.City,
            Photo = user.Photo
        };
    }

    [HttpPut("{id:int}")]
    public async Task<IActionResult> UpdateProfile(int id, UpdateProfileRequest request)
    {
        var user = await _db.Users.FindAsync(id);
        if (user == null) return NotFound();

        user.FullName = request.FullName;
        user.Description = request.Description;
        user.Phone = request.Phone;
        user.City = request.City;
        user.Photo = request.Photo;

        await _db.SaveChangesAsync();
        return NoContent();
    }

    [HttpPut("{id:int}/login")]
    public async Task<IActionResult> ChangeLogin(int id, ChangeLoginRequest request)
    {
        var user = await _db.Users.FindAsync(id);
        if (user == null) return NotFound();

        if (await _db.Users.AnyAsync(u => u.Login == request.NewLogin))
            return BadRequest("Пользователь с таким логином уже существует");

        user.Login = request.NewLogin;
        await _db.SaveChangesAsync();
        return NoContent();
    }
    

    [HttpPut("{id:int}/password")]
    public async Task<IActionResult> ChangePassword(int id, ChangePasswordRequest request)
    {
        var user = await _db.Users.FindAsync(id);
        if (user == null) return NotFound();

        if (!PasswordHelper.VerifyPassword(request.CurrentPassword, user.PasswordHash))
            return BadRequest("Текущий пароль указан неверно");

        if (PasswordHelper.VerifyPassword(request.NewPassword, user.PasswordHash))
            return BadRequest("Новый пароль не должен совпадать со старым");

        user.PasswordHash = PasswordHelper.HashPassword(request.NewPassword);
        await _db.SaveChangesAsync();
        return NoContent();
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> DeleteUser(int id)
    {
        var user = await _db.Users.FindAsync(id);
        if (user == null) return NotFound();

        _db.Users.Remove(user);
        await _db.SaveChangesAsync();
        return NoContent();
    }

    [HttpPost("{id:int}/photo")]
    public async Task<ActionResult<string>> UploadPhoto(int id, IFormFile file)
    {
        var user = await _db.Users.FindAsync(id);
        if (user == null) return NotFound();

        if (file == null || file.Length == 0)
            return BadRequest("Файл не выбран");

        var uploadsRoot = Path.Combine(_env.WebRootPath, "uploads");
        Directory.CreateDirectory(uploadsRoot);

        var ext = Path.GetExtension(file.FileName);
        var fileName = $"user_{id}_{Guid.NewGuid():N}{ext}";
        var filePath = Path.Combine(uploadsRoot, fileName);

        using (var stream = System.IO.File.Create(filePath))
        {
            await file.CopyToAsync(stream);
        }

        user.Photo = $"/uploads/{fileName}";
        await _db.SaveChangesAsync();

        return Ok(user.Photo);
    }
}