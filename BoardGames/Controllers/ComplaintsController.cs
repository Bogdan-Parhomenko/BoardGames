using BoardGamesApi.Data;
using BoardGamesApi.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace BoardGamesApi.Controllers;

[ApiController]
[Route("api/complaints")]
public class ComplaintsController : ControllerBase
{
    private readonly AppDbContext _db;

    public ComplaintsController(AppDbContext db)
    {
        _db = db;
    }

    [HttpPost]
    public async Task<IActionResult> CreateComplaint([FromBody] CreateComplaintRequest request)
    {
        if (!await _db.Users.AnyAsync(u => u.UserId == request.ReporterId))
            return BadRequest("Пользователь не найден");
        if (string.IsNullOrWhiteSpace(request.Reason))
            return BadRequest("Укажите причину жалобы");
        if (request.ComplaintType != "event" && request.ComplaintType != "review")
            return BadRequest("Неверный тип жалобы");

        if (request.ComplaintType == "event" && request.TargetEventId.HasValue &&
            !await _db.GameEvents.AnyAsync(e => e.EventId == request.TargetEventId.Value))
            return BadRequest("Событие не найдено");

        if (request.ComplaintType == "review" && request.TargetReviewId.HasValue &&
            !await _db.UserReviews.AnyAsync(r => r.ReviewId == request.TargetReviewId.Value))
            return BadRequest("Отзыв не найден");

        var exists = await _db.Complaints.AnyAsync(c =>
            c.ReporterId == request.ReporterId && c.ComplaintType == request.ComplaintType &&
            c.TargetEventId == request.TargetEventId && c.TargetReviewId == request.TargetReviewId &&
            c.Status == "pending");
        if (exists)
            return BadRequest("Вы уже подали жалобу на этот объект");

        _db.Complaints.Add(new Complaint
        {
            ReporterId = request.ReporterId,
            ComplaintType = request.ComplaintType,
            TargetEventId = request.TargetEventId,
            TargetReviewId = request.TargetReviewId,
            Reason = request.Reason.Trim(),
            CreatedAt = DateTime.UtcNow
        });
        await _db.SaveChangesAsync();
        return Ok();
    }
}