using BoardGamesApi.Data;
using BoardGamesApi.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace BoardGamesApi.Controllers;

[ApiController]
[Route("api/reviews")]
public class ReviewsController : ControllerBase
{
    private readonly AppDbContext _db;

    public ReviewsController(AppDbContext db)
    {
        _db = db;
    }

    /// <summary>
    /// Получить публичный профиль пользователя с отзывами
    /// </summary>
    [HttpGet("profile/{userId:int}")]
    public async Task<ActionResult<PublicProfileDto>> GetPublicProfile(int userId, [FromQuery] int? currentUserId)
    {
        var user = await _db.Users
            .AsNoTracking()
            .FirstOrDefaultAsync(u => u.UserId == userId);

        if (user == null)
            return NotFound("Пользователь не найден");

        var reviews = await _db.UserReviews
            .Where(r => r.TargetUserId == userId)
            .Include(r => r.Reviewer)
            .OrderByDescending(r => r.CreatedAt)
            .ToListAsync();

        var positiveCount = reviews.Count(r => r.Rating == ReviewRating.Positive);
        var neutralCount = reviews.Count(r => r.Rating == ReviewRating.Neutral);
        var negativeCount = reviews.Count(r => r.Rating == ReviewRating.Negative);

        ReviewDto? myReview = null;
        bool canReview = false;

        if (currentUserId.HasValue && currentUserId.Value != userId)
        {
            var existingReview = reviews.FirstOrDefault(r => r.ReviewerId == currentUserId.Value);
            if (existingReview != null)
            {
                myReview = new ReviewDto
                {
                    ReviewId = existingReview.ReviewId,
                    ReviewerId = existingReview.ReviewerId,
                    ReviewerName = existingReview.Reviewer.FullName,
                    ReviewerPhoto = existingReview.Reviewer.Photo,
                    Rating = existingReview.Rating.ToString().ToLower(),
                    Comment = existingReview.Comment,
                    CreatedAt = existingReview.CreatedAt,
                    IsOwn = true
                };
            }
            else
            {
                canReview = true;
            }
        }

        return new PublicProfileDto
        {
            UserId = user.UserId,
            FullName = user.FullName,
            Description = user.Description,
            Phone = user.Phone,
            City = user.City,
            Photo = user.Photo,
            PositiveCount = positiveCount,
            NeutralCount = neutralCount,
            NegativeCount = negativeCount,
            TotalReviews = reviews.Count,
            CanReview = canReview,
            MyReview = myReview,
            Reviews = reviews.Select(r => new ReviewDto
            {
                ReviewId = r.ReviewId,
                ReviewerId = r.ReviewerId,
                ReviewerName = r.Reviewer.FullName,
                ReviewerPhoto = r.Reviewer.Photo,
                Rating = r.Rating.ToString().ToLower(),
                Comment = r.Comment,
                CreatedAt = r.CreatedAt,
                IsOwn = currentUserId.HasValue && r.ReviewerId == currentUserId.Value
            }).ToList()
        };
    }

    /// <summary>
    /// Создать отзыв
    /// </summary>
    [HttpPost]
    public async Task<ActionResult<ReviewDto>> CreateReview(CreateReviewRequest request)
    {
        if (request.ReviewerId == request.TargetUserId)
            return BadRequest("Нельзя оставить отзыв о себе");

        if (!await _db.Users.AnyAsync(u => u.UserId == request.ReviewerId))
            return BadRequest("Автор отзыва не найден");

        if (!await _db.Users.AnyAsync(u => u.UserId == request.TargetUserId))
            return BadRequest("Пользователь не найден");

        if (await _db.UserReviews.AnyAsync(r =>
            r.ReviewerId == request.ReviewerId && r.TargetUserId == request.TargetUserId))
            return BadRequest("Вы уже оставили отзыв об этом пользователе");

        if (string.IsNullOrWhiteSpace(request.Comment))
            return BadRequest("Комментарий не может быть пустым");

        if (!Enum.TryParse<ReviewRating>(request.Rating, true, out var rating))
            return BadRequest("Неверный тип оценки");

        var reviewer = await _db.Users.FindAsync(request.ReviewerId);

        var review = new UserReview
        {
            ReviewerId = request.ReviewerId,
            TargetUserId = request.TargetUserId,
            Rating = rating,
            Comment = request.Comment.Trim(),
            CreatedAt = DateTime.UtcNow
        };

        _db.UserReviews.Add(review);
        await _db.SaveChangesAsync();

        return new ReviewDto
        {
            ReviewId = review.ReviewId,
            ReviewerId = review.ReviewerId,
            ReviewerName = reviewer!.FullName,
            ReviewerPhoto = reviewer.Photo,
            Rating = review.Rating.ToString().ToLower(),
            Comment = review.Comment,
            CreatedAt = review.CreatedAt,
            IsOwn = true
        };
    }

    /// <summary>
    /// Обновить свой отзыв
    /// </summary>
    [HttpPut("{reviewId:int}")]
    public async Task<ActionResult<ReviewDto>> UpdateReview(int reviewId, [FromQuery] int userId, UpdateReviewRequest request)
    {
        var review = await _db.UserReviews
            .Include(r => r.Reviewer)
            .FirstOrDefaultAsync(r => r.ReviewId == reviewId);

        if (review == null)
            return NotFound("Отзыв не найден");

        if (review.ReviewerId != userId)
            return BadRequest("Вы можете редактировать только свои отзывы");

        if (string.IsNullOrWhiteSpace(request.Comment))
            return BadRequest("Комментарий не может быть пустым");

        if (!Enum.TryParse<ReviewRating>(request.Rating, true, out var rating))
            return BadRequest("Неверный тип оценки");

        review.Rating = rating;
        review.Comment = request.Comment.Trim();

        await _db.SaveChangesAsync();

        return new ReviewDto
        {
            ReviewId = review.ReviewId,
            ReviewerId = review.ReviewerId,
            ReviewerName = review.Reviewer.FullName,
            ReviewerPhoto = review.Reviewer.Photo,
            Rating = review.Rating.ToString().ToLower(),
            Comment = review.Comment,
            CreatedAt = review.CreatedAt,
            IsOwn = true
        };
    }

    /// <summary>
    /// Удалить свой отзыв
    /// </summary>
    [HttpDelete("{reviewId:int}")]
    public async Task<IActionResult> DeleteReview(int reviewId, [FromQuery] int userId)
    {
        var review = await _db.UserReviews.FindAsync(reviewId);

        if (review == null)
            return NotFound("Отзыв не найден");

        if (review.ReviewerId != userId)
            return BadRequest("Вы можете удалить только свои отзывы");

        _db.UserReviews.Remove(review);
        await _db.SaveChangesAsync();

        return NoContent();
    }
}