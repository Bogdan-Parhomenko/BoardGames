namespace BoardGamesApi.Models;

public class GameEventDto
{
    public int GameEventId { get; set; }
    public int CreatorId { get; set; }
    public string CreatorName { get; set; } = null!;
    public string Title { get; set; } = null!;
    public string? Description { get; set; }
    public DateOnly EventDate { get; set; }
    public TimeOnly EventTime { get; set; }
    public int? DurationMinutes { get; set; }
    public string Address { get; set; } = null!;
    public int MaxPlayers { get; set; }
    public List<string> CategoryNames { get; set; } = new();
    public bool IsUserJoined { get; set; }
    public List<int> CategoryIds { get; set; } = new();
    public bool IsCompleted { get; set; }
}

public class CreateEventRequest
{
    public int CreatorId { get; set; }
    public string Title { get; set; } = null!;
    public string? Description { get; set; }
    public DateOnly EventDate { get; set; }
    public TimeOnly EventTime { get; set; }
    public int? DurationMinutes { get; set; }
    public string Address { get; set; } = null!;
    public int MaxPlayers { get; set; }
    public List<int>? CategoryIds { get; set; }
}

public class UpdateEventRequest
{
    public string Title { get; set; } = null!;
    public string? Description { get; set; }
    public DateOnly EventDate { get; set; }
    public TimeOnly EventTime { get; set; }
    public int? DurationMinutes { get; set; }
    public string Address { get; set; } = null!;
    public int MaxPlayers { get; set; }
    public List<int>? CategoryIds { get; set; }
}

public class JoinEventRequest
{
    public int UserId { get; set; }
    public string? Comment { get; set; }
}

public class EventParticipantDto
{
    public int UserId { get; set; }
    public string FullName { get; set; } = null!;
    public string? Phone { get; set; }
    public string? Photo { get; set; }
    public string? Comment { get; set; }
}

public class GameEventDetailsDto
{
    public int GameEventId { get; set; }
    public string Title { get; set; } = null!;
    public string? Description { get; set; }
    public DateOnly EventDate { get; set; }
    public TimeOnly EventTime { get; set; }
    public int? DurationMinutes { get; set; }
    public string Address { get; set; } = null!;
    public int MaxPlayers { get; set; }
    public int CreatorId { get; set; }
    public string CreatorName { get; set; } = null!;
    public string? CreatorPhone { get; set; }
    public string? CreatorPhoto { get; set; }
    public List<string> CategoryNames { get; set; } = new();
    public List<EventParticipantDto> Participants { get; set; } = new();
    public bool IsCompleted { get; set; }
}