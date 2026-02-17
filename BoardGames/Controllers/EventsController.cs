using BoardGamesApi.Data;
using BoardGamesApi.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace BoardGamesApi.Controllers;

[ApiController]
[Route("api/events")]
public class EventsController : ControllerBase
{
    private readonly AppDbContext _db;

    private static bool IsEventInPast(DateOnly eventDate, TimeOnly eventTime, DateTime now)
    {
        var start = eventDate.ToDateTime(eventTime);
        return start <= now;
    }

    public EventsController(AppDbContext db)
    {
        _db = db;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<GameEventDto>>> GetEvents([FromQuery] int? userId)
    {
        var now = DateTime.Now;
        var events = await _db.GameEvents
            .AsNoTracking()
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
                IsUserJoined = userId.HasValue &&
                   e.Participants.Any(p => p.UserId == userId.Value),
                IsCompleted = IsEventInPast(e.EventDate, e.EventTime, now)
            })
            .ToListAsync();

        return events;
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<GameEventDto>> GetEvent(int id)
    {
        var e = await _db.GameEvents.FindAsync(id);
        if (e == null) return NotFound();

        return new GameEventDto
        {
            GameEventId = e.EventId,
            CreatorId = e.CreatorId,
            Title = e.Title,
            Description = e.Description,
            EventDate = e.EventDate,
            EventTime = e.EventTime,
            DurationMinutes = e.DurationMinutes,
            Address = e.Address,
            MaxPlayers = e.MaxPlayers
        };
    }

    [HttpPost]
    public async Task<ActionResult<GameEventDto>> CreateEvent(CreateEventRequest request)
    {
        if (!await _db.Users.AnyAsync(u => u.UserId == request.CreatorId))
            return BadRequest("Указанный пользователь не существует");

        var now = DateTime.Now;
        if (IsEventInPast(request.EventDate, request.EventTime, now))
        {
            return BadRequest("Нельзя создавать событие в прошлом.");
        }

        var ev = new GameEvent
        {
            CreatorId = request.CreatorId,
            Title = request.Title,
            Description = request.Description,
            EventDate = request.EventDate,
            EventTime = request.EventTime,
            DurationMinutes = request.DurationMinutes,
            Address = request.Address,
            MaxPlayers = request.MaxPlayers
        };

        if (request.CategoryIds != null && request.CategoryIds.Any())
        {
            var categoryIds = request.CategoryIds.Distinct().ToList();

            var categories = await _db.GameCategories
            .Where(c => categoryIds.Contains(c.CategoryId))
            .ToListAsync();

            foreach (var category in categories)
            {
                ev.Categories.Add(category);
            }
        }

        _db.GameEvents.Add(ev);
        await _db.SaveChangesAsync();

        var dto = new GameEventDto
        {
            GameEventId = ev.EventId,
            CreatorId = ev.CreatorId,
            Title = ev.Title,
            Description = ev.Description,
            EventDate = ev.EventDate,
            EventTime = ev.EventTime,
            DurationMinutes = ev.DurationMinutes,
            Address = ev.Address,
            MaxPlayers = ev.MaxPlayers
        };

        return CreatedAtAction(nameof(GetEvent), new { id = ev.EventId }, dto);
    }

    [HttpPut("{id:int}")]
    public async Task<IActionResult> UpdateEvent(int id, UpdateEventRequest request)
    {
        var ev = await _db.GameEvents
            .Include(e => e.Categories)
            .Include(e => e.Participants)
            .FirstOrDefaultAsync(e => e.EventId == id);

        if (ev == null) return NotFound();

        var now = DateTime.Now;

        if (IsEventInPast(ev.EventDate, ev.EventTime, now))
        {
            return BadRequest("Нельзя редактировать завершенное событие.");
        }

        if (IsEventInPast(request.EventDate, request.EventTime, now))
        {
            return BadRequest("Нельзя устанавливать дату и время в прошлом.");
        }

        ev.Title = request.Title;
        ev.Description = request.Description;
        ev.EventDate = request.EventDate;
        ev.EventTime = request.EventTime;
        ev.DurationMinutes = request.DurationMinutes;
        ev.Address = request.Address;
        ev.MaxPlayers = request.MaxPlayers;

        var currentCount = ev.Participants.Count;
        if (currentCount > request.MaxPlayers)
        {
            return BadRequest(
                $"Нельзя установить максимальное количество игроков {request.MaxPlayers}, " +
                $"так как уже записано {currentCount} участников.");
        }

        ev.Categories.Clear();

        if (request.CategoryIds != null && request.CategoryIds.Any())
        {
            var categoryIds = request.CategoryIds.Distinct().ToList();

            var categories = await _db.GameCategories
                .Where(c => categoryIds.Contains(c.CategoryId))
                .ToListAsync();

            foreach (var category in categories)
            {
                ev.Categories.Add(category);
            }
        }

        await _db.SaveChangesAsync();
        return NoContent();
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> DeleteEvent(int id)
    {
        var ev = await _db.GameEvents.FindAsync(id);
        if (ev == null) return NotFound();

        _db.GameEvents.Remove(ev);
        await _db.SaveChangesAsync();
        return NoContent();
    }

    [HttpPost("{id:int}/join")]
    public async Task<IActionResult> JoinEvent(int id, JoinEventRequest request)
    {
        var ev = await _db.GameEvents
            .Include(e => e.Participants)
            .FirstOrDefaultAsync(e => e.EventId == id);

        if (ev == null) return NotFound();

        var now = DateTime.Now;
        if (IsEventInPast(ev.EventDate, ev.EventTime, now))
        {
            return BadRequest("Нельзя записаться на завершенное событие.");
        }

        if (!await _db.Users.AnyAsync(u => u.UserId == request.UserId))
            return BadRequest("Пользователь не найден");

        if (ev.Participants.Any(p => p.UserId == request.UserId))
            return BadRequest("Пользователь уже записан на событие");

        var currentPlayers = ev.Participants.Count;
        if (currentPlayers >= ev.MaxPlayers)
            return BadRequest("Достигнуто максимальное количество участников");

        ev.Participants.Add(new UserEventParticipation
        {
            UserId = request.UserId,
            EventId = ev.EventId,
            Comment = request.Comment
        });

        await _db.SaveChangesAsync();
        return Ok();
    }

    [HttpDelete("{id:int}/join")]
    public async Task<IActionResult> LeaveEvent(int id, [FromQuery] int userId)
    {
        var ev = await _db.GameEvents.FindAsync(id);
        if (ev == null)
            return NotFound("Событие не найдено");

        var now = DateTime.Now;
        if (IsEventInPast(ev.EventDate, ev.EventTime, now))
        {
            return BadRequest("Нельзя отменить запись на завершенное событие.");
        }

        var participation = await _db.UserEventParticipations
            .FirstOrDefaultAsync(p => p.EventId == id && p.UserId == userId);

        if (participation == null)
            return NotFound("Запись пользователя на событие не найдена");

        _db.UserEventParticipations.Remove(participation);
        await _db.SaveChangesAsync();
        return NoContent();
    }

    [HttpGet("{id:int}/details")]
    public async Task<ActionResult<GameEventDetailsDto>> GetEventDetails(int id)
    {
        var ev = await _db.GameEvents
            .Include(e => e.Creator)
            .Include(e => e.Categories)
            .Include(e => e.Participants)
                .ThenInclude(p => p.User)
            .AsNoTracking()
            .FirstOrDefaultAsync(e => e.EventId == id);

        if (ev == null) return NotFound();

        var now = DateTime.Now;
        var dto = new GameEventDetailsDto
        {
            GameEventId = ev.EventId,
            Title = ev.Title,
            Description = ev.Description,
            EventDate = ev.EventDate,
            EventTime = ev.EventTime,
            DurationMinutes = ev.DurationMinutes,
            Address = ev.Address,
            MaxPlayers = ev.MaxPlayers,
            CreatorName = ev.Creator.FullName,
            CreatorPhone = ev.Creator.Phone,
            CreatorPhoto = ev.Creator.Photo,
            CategoryNames = ev.Categories.Select(c => c.Name).ToList(),
            Participants = ev.Participants
                .Select(p => new EventParticipantDto
                {
                    UserId = p.UserId,
                    FullName = p.User.FullName,
                    Phone = p.User.Phone,
                    Photo = p.User.Photo,   
                    Comment = p.Comment
                })
                .ToList(),
            IsCompleted = IsEventInPast(ev.EventDate, ev.EventTime, now)
        };

        return dto;
    }
}