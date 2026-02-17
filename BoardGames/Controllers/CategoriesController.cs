using BoardGamesApi.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace BoardGamesApi.Controllers;

[ApiController]
[Route("api/categories")]
public class CategoriesController : ControllerBase
{
    private readonly AppDbContext _db;

    public CategoriesController(AppDbContext db)
    {
        _db = db;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<object>>> GetCategories()
    {
        var cats = await _db.GameCategories
            .AsNoTracking()
            .OrderBy(c => c.Name)
            .Select(c => new { id = c.CategoryId, name = c.Name })
            .ToListAsync();

        return Ok(cats);
    }
}