namespace BoardGamesApi.Models;

// ---- Удаление событий ----
public class AdminDeleteEventRequest
{
    public int AdminUserId { get; set; }
    public string Reason { get; set; } = null!;
}

// ---- Жалобы ----
public class CreateComplaintRequest
{
    public int ReporterId { get; set; }
    public string ComplaintType { get; set; } = null!; // "event" / "review"
    public int? TargetEventId { get; set; }
    public int? TargetReviewId { get; set; }
    public string Reason { get; set; } = null!;
}

public class ComplaintDto
{
    public int ComplaintId { get; set; }
    public int ReporterId { get; set; }
    public string ReporterName { get; set; } = null!;
    public string? ReporterPhoto { get; set; }
    public string ComplaintType { get; set; } = null!;
    public int? TargetEventId { get; set; }
    public string? TargetEventTitle { get; set; }
    public int? TargetEventCreatorId { get; set; }
    public string? TargetEventCreatorName { get; set; }
    public int? TargetReviewId { get; set; }
    public string? TargetReviewComment { get; set; }
    public int? TargetReviewAuthorId { get; set; }
    public string? TargetReviewAuthorName { get; set; }
    public int? TargetReviewTargetUserId { get; set; }
    public string? TargetReviewTargetUserName { get; set; }
    public string Reason { get; set; } = null!;
    public string Status { get; set; } = null!;
    public string? AdminComment { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? ResolvedAt { get; set; }
}

public class ResolveComplaintRequest
{
    public int AdminUserId { get; set; }
    public string Status { get; set; } = null!; // "reviewed" / "dismissed"
    public string? AdminComment { get; set; }
}

// ---- Баны на отзывы ----
public class CreateReviewBanRequest
{
    public int AdminUserId { get; set; }
    public int UserId { get; set; }
    public string Reason { get; set; } = null!;
    public string Duration { get; set; } = null!; // "week", "month", "forever"
}

public class ReviewBanDto
{
    public int BanId { get; set; }
    public int UserId { get; set; }
    public string UserName { get; set; } = null!;
    public string? UserPhoto { get; set; }
    public string Reason { get; set; } = null!;
    public DateTime BannedAt { get; set; }
    public DateTime? ExpiresAt { get; set; }
    public bool IsActive { get; set; }
    public string BannedByName { get; set; } = null!;
    public string? UnbannedByName { get; set; }
    public DateTime? UnbannedAt { get; set; }
}

// ---- Баны пользователей ----
public class CreateUserBanRequest
{
    public int AdminUserId { get; set; }
    public int UserId { get; set; }
    public string Reason { get; set; } = null!;
    public string Duration { get; set; } = null!; // "week", "month", "forever"
}

public class UserBanDto
{
    public int BanId { get; set; }
    public int UserId { get; set; }
    public string UserName { get; set; } = null!;
    public string? UserPhoto { get; set; }
    public string Reason { get; set; } = null!;
    public DateTime BannedAt { get; set; }
    public DateTime? ExpiresAt { get; set; }
    public bool IsActive { get; set; }
    public string BannedByName { get; set; } = null!;
    public string? UnbannedByName { get; set; }
    public DateTime? UnbannedAt { get; set; }
}

// ---- Все отзывы ----
public class AdminReviewDto
{
    public int ReviewId { get; set; }
    public int ReviewerId { get; set; }
    public string ReviewerName { get; set; } = null!;
    public string? ReviewerPhoto { get; set; }
    public int TargetUserId { get; set; }
    public string TargetUserName { get; set; } = null!;
    public string? TargetUserPhoto { get; set; }
    public string Rating { get; set; } = null!;
    public string Comment { get; set; } = null!;
    public DateTime CreatedAt { get; set; }
}

// ---- Статистика ----
public class PlatformStatsDto
{
    public int TotalUsers { get; set; }
    public int TotalEvents { get; set; }
    public int ActiveEvents { get; set; }
    public int CompletedEvents { get; set; }
    public int TotalMessages { get; set; }
    public int TotalReviews { get; set; }
    public int TotalComplaints { get; set; }
    public int PendingComplaints { get; set; }
    public int ActiveReviewBans { get; set; }
    public int ActiveUserBans { get; set; }
}

// ---- Список пользователей ----
public class AdminUserDto
{
    public int UserId { get; set; }
    public string Login { get; set; } = null!;
    public string FullName { get; set; } = null!;
    public string? Photo { get; set; }
    public string? City { get; set; }
    public string Role { get; set; } = null!;
    public bool IsVkUser { get; set; }
    public int EventsCreated { get; set; }
    public int EventsParticipated { get; set; }
    public int ReviewsWritten { get; set; }
    public int ReviewsReceived { get; set; }
    public bool IsBanned { get; set; }
    public bool IsReviewBanned { get; set; }
}

public class NotificationDto
{
    public int NotificationId { get; set; }
    public string Title { get; set; } = null!;
    public string Message { get; set; } = null!;
    public bool IsRead { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class CategoryRequest
{
    public string Name { get; set; } = null!;
    public string? Description { get; set; }
}