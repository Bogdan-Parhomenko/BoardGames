using BoardGamesApi.Data;
using BoardGamesApi.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace BoardGamesApi.Controllers;

[ApiController]
[Route("api/notifications")]
public class NotificationsController : ControllerBase
{
    private readonly AppDbContext _db;

    public NotificationsController(AppDbContext db)
    {
        _db = db;
    }

    [HttpGet("user/{userId:int}")]
    public async Task<ActionResult<List<NotificationDto>>> GetNotifications(int userId)
    {
        return await _db.Notifications
            .Where(n => n.UserId == userId)
            .OrderByDescending(n => n.CreatedAt)
            .Select(n => new NotificationDto
            {
                NotificationId = n.NotificationId,
                Title = n.Title,
                Message = n.Message,
                IsRead = n.IsRead,
                CreatedAt = n.CreatedAt
            }).ToListAsync();
    }

    [HttpGet("user/{userId:int}/unread-count")]
    public async Task<ActionResult<int>> GetUnreadCount(int userId)
    {
        return await _db.Notifications.Where(n => n.UserId == userId && !n.IsRead).CountAsync();
    }

    [HttpPut("{notificationId:int}/read")]
    public async Task<IActionResult> MarkAsRead(int notificationId)
    {
        var n = await _db.Notifications.FindAsync(notificationId);
        if (n == null) return NotFound();
        n.IsRead = true;
        await _db.SaveChangesAsync();
        return NoContent();
    }

    [HttpPut("user/{userId:int}/read-all")]
    public async Task<IActionResult> MarkAllAsRead(int userId)
    {
        var unread = await _db.Notifications.Where(n => n.UserId == userId && !n.IsRead).ToListAsync();
        foreach (var n in unread) n.IsRead = true;
        await _db.SaveChangesAsync();
        return NoContent();
    }

    [HttpDelete("{notificationId:int}")]
    public async Task<IActionResult> DeleteNotification(int notificationId)
    {
        var n = await _db.Notifications.FindAsync(notificationId);
        if (n == null) return NotFound();
        _db.Notifications.Remove(n);
        await _db.SaveChangesAsync();
        return NoContent();
    }
}