using BoardGamesApi.Data;
using BoardGamesApi.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace BoardGamesApi.Controllers;

[ApiController]
[Route("api/admin")]
public class AdminController : ControllerBase
{
    private readonly AppDbContext _db;

    public AdminController(AppDbContext db)
    {
        _db = db;
    }

    private async Task<bool> IsAdmin(int userId)
    {
        var user = await _db.Users.FindAsync(userId);
        return user?.Role == "admin";
    }

    private static DateTime? CalculateExpiry(string duration) => duration.ToLower() switch
    {
        "week" => DateTime.UtcNow.AddDays(7),
        "month" => DateTime.UtcNow.AddMonths(1),
        "forever" => null,
        _ => null
    };

    // ==================== СТАТИСТИКА ====================

    [HttpGet("stats")]
    public async Task<ActionResult<PlatformStatsDto>> GetStats([FromQuery] int adminUserId)
    {
        if (!await IsAdmin(adminUserId)) return Forbid();

        var now = DateTime.Now;
        return new PlatformStatsDto
        {
            TotalUsers = await _db.Users.CountAsync(),
            TotalEvents = await _db.GameEvents.CountAsync(),
            ActiveEvents = await _db.GameEvents.CountAsync(e => e.EventDate.ToDateTime(e.EventTime) > now),
            CompletedEvents = await _db.GameEvents.CountAsync(e => e.EventDate.ToDateTime(e.EventTime) <= now),
            TotalMessages = await _db.Messages.CountAsync(m => !m.IsDeleted),
            TotalReviews = await _db.UserReviews.CountAsync(),
            TotalComplaints = await _db.Complaints.CountAsync(),
            PendingComplaints = await _db.Complaints.CountAsync(c => c.Status == "pending"),
            ActiveReviewBans = await _db.ReviewBans.CountAsync(b => b.IsActive && (b.ExpiresAt == null || b.ExpiresAt > DateTime.UtcNow)),
            ActiveUserBans = await _db.UserBans.CountAsync(b => b.IsActive && (b.ExpiresAt == null || b.ExpiresAt > DateTime.UtcNow))
        };
    }

    // ==================== СОБЫТИЯ ====================

    [HttpGet("events")]
    public async Task<ActionResult<IEnumerable<GameEventDto>>> GetAllEvents([FromQuery] int adminUserId)
    {
        if (!await IsAdmin(adminUserId)) return Forbid();
        var now = DateTime.Now;

        return await _db.GameEvents.AsNoTracking()
            .Include(e => e.Creator).Include(e => e.Categories).Include(e => e.Participants)
            .Select(e => new GameEventDto
            {
                GameEventId = e.EventId,
                CreatorId = e.CreatorId,
                CreatorName = e.Creator.FullName,
                Title = e.Title,
                Description = e.Description,
                EventDate = e.EventDate,
                EventTime = e.EventTime,
                DurationMinutes = e.DurationMinutes,
                Address = e.Address,
                MaxPlayers = e.MaxPlayers,
                CategoryNames = e.Categories.Select(c => c.Name).ToList(),
                CategoryIds = e.Categories.Select(c => c.CategoryId).ToList(),
                IsUserJoined = false,
                IsCompleted = e.EventDate.ToDateTime(e.EventTime) <= now
            }).OrderByDescending(e => e.EventDate).ToListAsync();
    }

    [HttpDelete("events/{eventId:int}")]
    public async Task<IActionResult> DeleteEvent(int eventId, [FromBody] AdminDeleteEventRequest request)
    {
        if (!await IsAdmin(request.AdminUserId)) return Forbid();
        var ev = await _db.GameEvents.Include(e => e.Creator).FirstOrDefaultAsync(e => e.EventId == eventId);
        if (ev == null) return NotFound("Событие не найдено");
        if (string.IsNullOrWhiteSpace(request.Reason)) return BadRequest("Укажите причину удаления");

        _db.Notifications.Add(new Notification
        {
            UserId = ev.CreatorId,
            Title = "Событие удалено администратором",
            Message = $"Ваше событие «{ev.Title}» было удалено администратором.\n\nПричина: {request.Reason}",
            CreatedAt = DateTime.UtcNow
        });

        _db.GameEvents.Remove(ev);
        await _db.SaveChangesAsync();
        return NoContent();
    }

    // ==================== ОТЗЫВЫ ====================

    [HttpGet("reviews")]
    public async Task<ActionResult<List<AdminReviewDto>>> GetAllReviews([FromQuery] int adminUserId)
    {
        if (!await IsAdmin(adminUserId)) return Forbid();

        return await _db.UserReviews.AsNoTracking()
            .Include(r => r.Reviewer).Include(r => r.TargetUser)
            .OrderByDescending(r => r.CreatedAt)
            .Select(r => new AdminReviewDto
            {
                ReviewId = r.ReviewId,
                ReviewerId = r.ReviewerId,
                ReviewerName = r.Reviewer.FullName,
                ReviewerPhoto = r.Reviewer.Photo,
                TargetUserId = r.TargetUserId,
                TargetUserName = r.TargetUser.FullName,
                TargetUserPhoto = r.TargetUser.Photo,
                Rating = r.Rating.ToString().ToLower(),
                Comment = r.Comment,
                CreatedAt = r.CreatedAt
            }).ToListAsync();
    }

    [HttpDelete("reviews/{reviewId:int}")]
    public async Task<IActionResult> DeleteReview(int reviewId, [FromQuery] int adminUserId)
    {
        if (!await IsAdmin(adminUserId)) return Forbid();
        var review = await _db.UserReviews.FindAsync(reviewId);
        if (review == null) return NotFound();

        _db.Notifications.Add(new Notification
        {
            UserId = review.ReviewerId,
            Title = "Отзыв удалён администратором",
            Message = "Ваш отзыв был удалён администратором.",
            CreatedAt = DateTime.UtcNow
        });
        _db.UserReviews.Remove(review);
        await _db.SaveChangesAsync();
        return NoContent();
    }

    // ==================== БАНЫ НА ОТЗЫВЫ ====================

    [HttpGet("review-bans")]
    public async Task<ActionResult<List<ReviewBanDto>>> GetReviewBans([FromQuery] int adminUserId)
    {
        if (!await IsAdmin(adminUserId)) return Forbid();
        return await _db.ReviewBans.AsNoTracking().Include(b => b.User).Include(b => b.Admin)
            .OrderByDescending(b => b.BannedAt)
            .Select(b => new ReviewBanDto
            {
                BanId = b.BanId,
                UserId = b.UserId,
                UserName = b.User.FullName,
                UserPhoto = b.User.Photo,
                Reason = b.Reason,
                BannedAt = b.BannedAt,
                ExpiresAt = b.ExpiresAt,
                IsActive = b.IsActive && (b.ExpiresAt == null || b.ExpiresAt > DateTime.UtcNow),
                BannedByName = b.Admin.FullName,
                UnbannedByName = b.UnbannedByName,
                UnbannedAt = b.UnbannedAt
            }).ToListAsync();
    }

    [HttpPost("review-bans")]
    public async Task<IActionResult> CreateReviewBan([FromBody] CreateReviewBanRequest request)
    {
        if (!await IsAdmin(request.AdminUserId)) return Forbid();
        var user = await _db.Users.FindAsync(request.UserId);
        if (user == null) return NotFound("Пользователь не найден");
        if (user.Role == "admin") return BadRequest("Нельзя забанить администратора");

        foreach (var old in await _db.ReviewBans.Where(b => b.UserId == request.UserId && b.IsActive).ToListAsync())
            old.IsActive = false;

        var durationText = request.Duration switch { "week" => "на неделю", "month" => "на месяц", _ => "навсегда" };

        _db.ReviewBans.Add(new ReviewBan
        {
            UserId = request.UserId,
            BannedBy = request.AdminUserId,
            Reason = request.Reason,
            ExpiresAt = CalculateExpiry(request.Duration),
            IsActive = true
        });
        _db.Notifications.Add(new Notification
        {
            UserId = request.UserId,
            Title = "Ограничение на отзывы",
            Message = $"Вам запрещено оставлять отзывы {durationText}.\n\nПричина: {request.Reason}",
            CreatedAt = DateTime.UtcNow
        });
        await _db.SaveChangesAsync();
        return Ok();
    }

    [HttpDelete("review-bans/{banId:int}")]
    public async Task<IActionResult> RemoveReviewBan(int banId, [FromQuery] int adminUserId)
    {
        if (!await IsAdmin(adminUserId)) return Forbid();
        var ban = await _db.ReviewBans.FindAsync(banId);
        if (ban == null) return NotFound();

        var admin = await _db.Users.FindAsync(adminUserId);

        ban.IsActive = false;
        ban.UnbannedByName = admin?.FullName;
        ban.UnbannedAt = DateTime.UtcNow;

        _db.Notifications.Add(new Notification
        {
            UserId = ban.UserId,
            Title = "Ограничение на отзывы снято",
            Message = "Ограничение на оставление отзывов было снято администратором.",
            CreatedAt = DateTime.UtcNow
        });
        await _db.SaveChangesAsync();
        return NoContent();
    }

    // ==================== БАНЫ ПОЛЬЗОВАТЕЛЕЙ ====================

    [HttpGet("user-bans")]
    public async Task<ActionResult<List<UserBanDto>>> GetUserBans([FromQuery] int adminUserId)
    {
        if (!await IsAdmin(adminUserId)) return Forbid();
        return await _db.UserBans.AsNoTracking().Include(b => b.User).Include(b => b.Admin)
            .OrderByDescending(b => b.BannedAt)
            .Select(b => new UserBanDto
            {
                BanId = b.BanId,
                UserId = b.UserId,
                UserName = b.User.FullName,
                UserPhoto = b.User.Photo,
                Reason = b.Reason,
                BannedAt = b.BannedAt,
                ExpiresAt = b.ExpiresAt,
                IsActive = b.IsActive && (b.ExpiresAt == null || b.ExpiresAt > DateTime.UtcNow),
                BannedByName = b.Admin.FullName,
                UnbannedByName = b.UnbannedByName,
                UnbannedAt = b.UnbannedAt
            }).ToListAsync();
    }

    [HttpPost("user-bans")]
    public async Task<IActionResult> CreateUserBan([FromBody] CreateUserBanRequest request)
    {
        if (!await IsAdmin(request.AdminUserId)) return Forbid();
        var user = await _db.Users.FindAsync(request.UserId);
        if (user == null) return NotFound("Пользователь не найден");
        if (user.Role == "admin") return BadRequest("Нельзя забанить администратора");

        foreach (var old in await _db.UserBans.Where(b => b.UserId == request.UserId && b.IsActive).ToListAsync())
            old.IsActive = false;

        var durationText = request.Duration switch { "week" => "на неделю", "month" => "на месяц", _ => "навсегда" };

        _db.UserBans.Add(new UserBan
        {
            UserId = request.UserId,
            BannedBy = request.AdminUserId,
            Reason = request.Reason,
            ExpiresAt = CalculateExpiry(request.Duration),
            IsActive = true
        });
        _db.Notifications.Add(new Notification
        {
            UserId = request.UserId,
            Title = "Аккаунт заблокирован",
            Message = $"Ваш аккаунт заблокирован {durationText}.\n\nПричина: {request.Reason}",
            CreatedAt = DateTime.UtcNow
        });
        await _db.SaveChangesAsync();
        return Ok();
    }

    [HttpDelete("user-bans/{banId:int}")]
    public async Task<IActionResult> RemoveUserBan(int banId, [FromQuery] int adminUserId)
    {
        if (!await IsAdmin(adminUserId)) return Forbid();
        var ban = await _db.UserBans.FindAsync(banId);
        if (ban == null) return NotFound();

        var admin = await _db.Users.FindAsync(adminUserId);

        ban.IsActive = false;
        ban.UnbannedByName = admin?.FullName;
        ban.UnbannedAt = DateTime.UtcNow;

        _db.Notifications.Add(new Notification
        {
            UserId = ban.UserId,
            Title = "Аккаунт разблокирован",
            Message = "Ваш аккаунт был разблокирован администратором.",
            CreatedAt = DateTime.UtcNow
        });
        await _db.SaveChangesAsync();
        return NoContent();
    }

    // ==================== ПОЛЬЗОВАТЕЛИ ====================

    [HttpGet("users")]
    public async Task<ActionResult<List<AdminUserDto>>> GetAllUsers([FromQuery] int adminUserId)
    {
        if (!await IsAdmin(adminUserId)) return Forbid();
        var now = DateTime.UtcNow;

        return await _db.Users.AsNoTracking()
            .Select(u => new AdminUserDto
            {
                UserId = u.UserId,
                Login = u.Login,
                FullName = u.FullName,
                Photo = u.Photo,
                City = u.City,
                Role = u.Role,
                IsVkUser = u.VkId != null,
                EventsCreated = u.CreatedEvents.Count,
                EventsParticipated = u.EventParticipations.Count,
                ReviewsWritten = u.ReviewsWritten.Count,
                ReviewsReceived = u.ReviewsReceived.Count,
                IsBanned = u.UserBans.Any(b => b.IsActive && (b.ExpiresAt == null || b.ExpiresAt > now)),
                IsReviewBanned = u.ReviewBans.Any(b => b.IsActive && (b.ExpiresAt == null || b.ExpiresAt > now))
            }).OrderBy(u => u.FullName).ToListAsync();
    }

    // ==================== ЖАЛОБЫ ====================

    [HttpGet("complaints")]
    public async Task<ActionResult<List<ComplaintDto>>> GetComplaints([FromQuery] int adminUserId, [FromQuery] string? status)
    {
        if (!await IsAdmin(adminUserId)) return Forbid();

        var query = _db.Complaints.AsNoTracking()
            .Include(c => c.Reporter)
            .Include(c => c.TargetEvent).ThenInclude(e => e!.Creator)
            .Include(c => c.TargetReview).ThenInclude(r => r!.Reviewer)
            .Include(c => c.TargetReview).ThenInclude(r => r!.TargetUser)
            .AsQueryable();

        if (!string.IsNullOrEmpty(status))
            query = query.Where(c => c.Status == status);

        var complaints = await query.OrderByDescending(c => c.CreatedAt).ToListAsync();

        return complaints.Select(c => new ComplaintDto
        {
            ComplaintId = c.ComplaintId,
            ReporterId = c.ReporterId,
            ReporterName = c.Reporter.FullName,
            ReporterPhoto = c.Reporter.Photo,
            ComplaintType = c.ComplaintType,
            TargetEventId = c.TargetEventId,
            TargetEventTitle = c.TargetEvent?.Title,
            TargetEventCreatorId = c.TargetEvent?.CreatorId,
            TargetEventCreatorName = c.TargetEvent?.Creator.FullName,
            TargetReviewId = c.TargetReviewId,
            TargetReviewComment = c.TargetReview?.Comment,
            TargetReviewAuthorId = c.TargetReview?.ReviewerId,
            TargetReviewAuthorName = c.TargetReview?.Reviewer.FullName,
            TargetReviewTargetUserId = c.TargetReview?.TargetUserId,
            TargetReviewTargetUserName = c.TargetReview?.TargetUser.FullName,
            Reason = c.Reason,
            Status = c.Status,
            AdminComment = c.AdminComment,
            CreatedAt = c.CreatedAt,
            ResolvedAt = c.ResolvedAt
        }).ToList();
    }

    [HttpPut("complaints/{complaintId:int}")]
    public async Task<IActionResult> ResolveComplaint(int complaintId, [FromBody] ResolveComplaintRequest request)
    {
        if (!await IsAdmin(request.AdminUserId)) return Forbid();
        var complaint = await _db.Complaints.FindAsync(complaintId);
        if (complaint == null) return NotFound();

        complaint.Status = request.Status;
        complaint.AdminComment = request.AdminComment;
        complaint.ResolvedAt = DateTime.UtcNow;

        _db.Notifications.Add(new Notification
        {
            UserId = complaint.ReporterId,
            Title = "Жалоба рассмотрена",
            Message = $"Ваша жалоба была рассмотрена.\n\nСтатус: {(request.Status == "reviewed" ? "Принята к сведению" : "Отклонена")}" +
                      (string.IsNullOrEmpty(request.AdminComment) ? "" : $"\n\nКомментарий: {request.AdminComment}"),
            CreatedAt = DateTime.UtcNow
        });
        await _db.SaveChangesAsync();
        return NoContent();
    }

    // ==================== КАТЕГОРИИ ====================

    [HttpPost("categories")]
    public async Task<IActionResult> CreateCategory([FromQuery] int adminUserId, [FromBody] CategoryRequest request)
    {
        if (!await IsAdmin(adminUserId)) return Forbid();
        if (await _db.GameCategories.AnyAsync(c => c.Name.ToLower() == request.Name.ToLower()))
            return BadRequest("Категория с таким именем уже существует");

        var cat = new GameCategory { Name = request.Name, Description = request.Description };
        _db.GameCategories.Add(cat);
        await _db.SaveChangesAsync();
        return Ok(new { id = cat.CategoryId, name = cat.Name });
    }

    [HttpPut("categories/{id:int}")]
    public async Task<IActionResult> UpdateCategory(int id, [FromQuery] int adminUserId, [FromBody] CategoryRequest request)
    {
        if (!await IsAdmin(adminUserId)) return Forbid();
        var cat = await _db.GameCategories.FindAsync(id);
        if (cat == null) return NotFound();
        cat.Name = request.Name;
        cat.Description = request.Description;
        await _db.SaveChangesAsync();
        return NoContent();
    }

    [HttpDelete("categories/{id:int}")]
    public async Task<IActionResult> DeleteCategory(int id, [FromQuery] int adminUserId)
    {
        if (!await IsAdmin(adminUserId)) return Forbid();
        var cat = await _db.GameCategories.FindAsync(id);
        if (cat == null) return NotFound();
        _db.GameCategories.Remove(cat);
        await _db.SaveChangesAsync();
        return NoContent();
    }
}