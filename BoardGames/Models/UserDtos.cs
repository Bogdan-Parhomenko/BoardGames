namespace BoardGamesApi.Models;

public class UserProfileDto
{
    public int UserId { get; set; }
    public string Login { get; set; } = null!;
    public string FullName { get; set; } = null!;
    public string? Description { get; set; }
    public string? Phone { get; set; }
    public string? City { get; set; }
    public string? Photo { get; set; }
}

public class UpdateProfileRequest
{
    public string FullName { get; set; } = null!;
    public string? Description { get; set; }
    public string? Phone { get; set; }
    public string? City { get; set; }
    public string? Photo { get; set; }
}

public class ChangeLoginRequest
{
    public string NewLogin { get; set; } = null!;
}

public class ChangePasswordRequest
{
    public string CurrentPassword { get; set; } = null!;
    public string NewPassword { get; set; } = null!;
}