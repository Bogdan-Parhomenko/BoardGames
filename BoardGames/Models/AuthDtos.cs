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
}