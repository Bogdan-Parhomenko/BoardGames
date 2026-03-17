namespace BoardGamesApi.Models;

public class ReviewDto
{
    public int ReviewId { get; set; }
    public int ReviewerId { get; set; }
    public string ReviewerName { get; set; } = null!;
    public string? ReviewerPhoto { get; set; }
    public string Rating { get; set; } = null!;
    public string Comment { get; set; } = null!;
    public DateTime CreatedAt { get; set; }
    public bool IsOwn { get; set; }
}

public class CreateReviewRequest
{
    public int ReviewerId { get; set; }
    public int TargetUserId { get; set; }
    public string Rating { get; set; } = null!;  // "positive", "neutral", "negative"
    public string Comment { get; set; } = null!;
}

public class UpdateReviewRequest
{
    public string Rating { get; set; } = null!;
    public string Comment { get; set; } = null!;
}

public class PublicProfileDto
{
    public int UserId { get; set; }
    public string FullName { get; set; } = null!;
    public string? Description { get; set; }
    public string? Phone { get; set; }
    public string? City { get; set; }
    public string? Photo { get; set; }

    // Статистика отзывов
    public int PositiveCount { get; set; }
    public int NeutralCount { get; set; }
    public int NegativeCount { get; set; }
    public int TotalReviews { get; set; }

    // Отзывы
    public List<ReviewDto> Reviews { get; set; } = new();

    // Может ли текущий пользователь оставить отзыв
    public bool CanReview { get; set; }

    // Существующий отзыв текущего пользователя (если есть)
    public ReviewDto? MyReview { get; set; }
}