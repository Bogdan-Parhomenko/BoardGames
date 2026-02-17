namespace BoardGamesApi.Models;

public class FavoriteEventDto
{
    public int FavoriteEventId { get; set; }
    public int CreatorId { get; set; }
    public string Title { get; set; } = null!;
    public string? Description { get; set; }
    public string Address { get; set; } = null!;
}

public class CreateFavoriteEventRequest
{
    public int CreatorId { get; set; }
    public string Title { get; set; } = null!;
    public string? Description { get; set; }
    public string Address { get; set; } = null!;
}

public class CreateFavoriteFromEventRequest
{
    public int CreatorId { get; set; }
    public int GameEventId { get; set; }
}