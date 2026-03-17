namespace BoardGamesApi.Data;

public enum ReviewRating
{
    Positive,
    Neutral,
    Negative
}

public class UserReview
{
    public int ReviewId { get; set; }

    public int ReviewerId { get; set; }
    public User Reviewer { get; set; } = null!;

    public int TargetUserId { get; set; }
    public User TargetUser { get; set; } = null!;

    public ReviewRating Rating { get; set; }
    public string Comment { get; set; } = null!;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}