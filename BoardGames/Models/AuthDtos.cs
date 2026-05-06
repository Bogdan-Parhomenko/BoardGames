namespace BoardGamesApi.Models;

public class RegisterRequest
{
    public string Login { get; set; } = null!;
    public string Password { get; set; } = null!;
    public string FullName { get; set; } = null!;
}

public class LoginRequest
{
    public string Login { get; set; } = null!;
    public string Password { get; set; } = null!;
}

public class LoginResponse
{
    public int UserId { get; set; }
    public string Login { get; set; } = null!;
    public string FullName { get; set; } = null!;
    public string Role { get; set; } = "user";
}

public class VkIdLoginRequest
{
    public long VkUserId { get; set; }
    public string? FullName { get; set; }
    public string? Photo { get; set; }
    public string? City { get; set; }
}