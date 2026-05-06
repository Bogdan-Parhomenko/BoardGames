namespace BoardGamesApi.Data;

public class ReviewBan
{
    public int BanId { get; set; }
    public int UserId { get; set; }
    public User User { get; set; } = null!;
    public int BannedBy { get; set; }
    public User Admin { get; set; } = null!;
    public string Reason { get; set; } = null!;
    public DateTime BannedAt { get; set; } = DateTime.UtcNow;
    public DateTime? ExpiresAt { get; set; }
    public bool IsActive { get; set; } = true;
    public string? UnbannedByName { get; set; }
    public DateTime? UnbannedAt { get; set; }
}

public class UserBan
{
    public int BanId { get; set; }
    public int UserId { get; set; }
    public User User { get; set; } = null!;
    public int BannedBy { get; set; }
    public User Admin { get; set; } = null!;
    public string Reason { get; set; } = null!;
    public DateTime BannedAt { get; set; } = DateTime.UtcNow;
    public DateTime? ExpiresAt { get; set; }
    public bool IsActive { get; set; } = true;
    public string? UnbannedByName { get; set; }
    public DateTime? UnbannedAt { get; set; }
}

public class Complaint
{
    public int ComplaintId { get; set; }
    public int ReporterId { get; set; }
    public User Reporter { get; set; } = null!;
    public string ComplaintType { get; set; } = null!; // "event" или "review"
    public int? TargetEventId { get; set; }
    public GameEvent? TargetEvent { get; set; }
    public int? TargetReviewId { get; set; }
    public UserReview? TargetReview { get; set; }
    public string Reason { get; set; } = null!;
    public string Status { get; set; } = "pending";
    public string? AdminComment { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? ResolvedAt { get; set; }
}