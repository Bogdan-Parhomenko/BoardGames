using BoardGamesApi.Data;
using BoardGamesApi.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace BoardGamesApi.Controllers;

[ApiController]
[Route("api/favorites")]
public class FavoritesController : ControllerBase
{
    private readonly AppDbContext _db;

    public FavoritesController(AppDbContext db)
    {
        _db = db;
    }

    [HttpGet("user/{userId:int}")]
    public async Task<ActionResult<IEnumerable<FavoriteEventDto>>> GetFavorites(int userId)
    {
        var favorites = await _db.FavoriteEvents
            .Where(f => f.CreatorId == userId)
            .Select(f => new FavoriteEventDto
            {
                FavoriteEventId = f.FavoriteEventId,
                CreatorId = f.CreatorId,
                Title = f.Title,
                Description = f.Description,
                Address = f.Address
            })
            .ToListAsync();

        return favorites;
    }

    [HttpPost]
    public async Task<ActionResult<FavoriteEventDto>> CreateFavorite(CreateFavoriteEventRequest request)
    {
        if (!await _db.Users.AnyAsync(u => u.UserId == request.CreatorId))
            return BadRequest("Пользователь не найден");

        var exists = await _db.FavoriteEvents.AnyAsync(f =>
            f.CreatorId == request.CreatorId &&
            f.Title == request.Title &&
            f.Description == request.Description &&
            f.Address == request.Address);

        if (exists)
            return BadRequest("Такой шаблон уже существует");

        var fav = new FavoriteEvent
        {
            CreatorId = request.CreatorId,
            Title = request.Title,
            Description = request.Description,
            Address = request.Address
        };

        _db.FavoriteEvents.Add(fav);
        await _db.SaveChangesAsync();

        var dto = new FavoriteEventDto
        {
            FavoriteEventId = fav.FavoriteEventId,
            CreatorId = fav.CreatorId,
            Title = fav.Title,
            Description = fav.Description,
            Address = fav.Address
        };

        return CreatedAtAction(nameof(GetFavorites), new { userId = fav.CreatorId }, dto);
    }

    [HttpPost("from-event")]
    public async Task<ActionResult<FavoriteEventDto>> CreateFavoriteFromEvent(CreateFavoriteFromEventRequest request)
    {
        var ev = await _db.GameEvents.FindAsync(request.GameEventId);
        if (ev == null) return NotFound("Событие не найдено");

        if (!await _db.Users.AnyAsync(u => u.UserId == request.CreatorId))
            return BadRequest("Пользователь не найден");

        if (ev.CreatorId != request.CreatorId)
            return BadRequest("Добавлять событие в шаблон может только его создатель");

        var exists = await _db.FavoriteEvents.AnyAsync(f =>
            f.CreatorId == request.CreatorId &&
            f.Title == ev.Title &&
            f.Description == ev.Description &&
            f.Address == ev.Address);

        if (exists)
            return BadRequest("Такой шаблон уже существует");

        var fav = new FavoriteEvent
        {
            CreatorId = request.CreatorId,
            Title = ev.Title,
            Description = ev.Description,
            Address = ev.Address
        };

        _db.FavoriteEvents.Add(fav);
        await _db.SaveChangesAsync();

        var dto = new FavoriteEventDto
        {
            FavoriteEventId = fav.FavoriteEventId,
            CreatorId = fav.CreatorId,
            Title = fav.Title,
            Description = fav.Description,
            Address = fav.Address
        };

        return CreatedAtAction(nameof(GetFavorites), new { userId = fav.CreatorId }, dto);
    }

    [HttpDelete("{favoriteId:int}")]
    public async Task<IActionResult> DeleteFavorite(int favoriteId)
    {
        var fav = await _db.FavoriteEvents.FindAsync(favoriteId);
        if (fav == null) return NotFound();

        _db.FavoriteEvents.Remove(fav);
        await _db.SaveChangesAsync();
        return NoContent();
    }
}