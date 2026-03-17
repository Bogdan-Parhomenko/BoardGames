namespace BoardGamesApi.Data;

public class User
{
    public int UserId { get; set; }
    public string Login { get; set; } = null!;
    public string PasswordHash { get; set; } = null!;
    public string FullName { get; set; } = null!;
    public string? Description { get; set; }
    public string? Phone { get; set; }
    public string? City { get; set; }
    public string? Photo { get; set; }

    public ICollection<GameEvent> CreatedEvents { get; set; } = new List<GameEvent>();
    public ICollection<UserEventParticipation> EventParticipations { get; set; } = new List<UserEventParticipation>();
    public ICollection<FavoriteEvent> FavoriteEvents { get; set; } = new List<FavoriteEvent>();

    public ICollection<ChatParticipant> ChatParticipants { get; set; } = new List<ChatParticipant>();
    public ICollection<Message> SentMessages { get; set; } = new List<Message>();
}

public class GameCategory
{
    public int CategoryId { get; set; }
    public string Name { get; set; } = null!;
    public string? Description { get; set; }

    public ICollection<GameEvent> Events { get; set; } = new List<GameEvent>();
}

public class GameEvent
{
    public int EventId { get; set; }
    public int CreatorId { get; set; }
    public User Creator { get; set; } = null!;

    public string Title { get; set; } = null!;
    public string? Description { get; set; }
    public DateOnly EventDate { get; set; }
    public TimeOnly EventTime { get; set; }
    public int? DurationMinutes { get; set; }
    public string Address { get; set; } = null!;
    public int MaxPlayers { get; set; }

    public ICollection<UserEventParticipation> Participants { get; set; } = new List<UserEventParticipation>();
    public ICollection<GameCategory> Categories { get; set; } = new List<GameCategory>();
}

public class UserEventParticipation
{
    public int UserId { get; set; }
    public User User { get; set; } = null!;

    public int EventId { get; set; }
    public GameEvent GameEvent { get; set; } = null!;

    public string? Comment { get; set; }
}

public class FavoriteEvent
{
    public int FavoriteEventId { get; set; }
    public int CreatorId { get; set; }
    public User Creator { get; set; } = null!;

    public string Title { get; set; } = null!;
    public string? Description { get; set; }
    public string Address { get; set; } = null!;
}