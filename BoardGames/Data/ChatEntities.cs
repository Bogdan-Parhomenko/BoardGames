namespace BoardGamesApi.Data;

public enum ChatType
{
    Private,
    Event
}

public class Chat
{
    public int ChatId { get; set; }
    public ChatType ChatType { get; set; }
    public int? EventId { get; set; }
    public GameEvent? Event { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<ChatParticipant> Participants { get; set; } = new List<ChatParticipant>();
    public ICollection<Message> Messages { get; set; } = new List<Message>();
}

public class ChatParticipant
{
    public int ChatId { get; set; }
    public Chat Chat { get; set; } = null!;

    public int UserId { get; set; }
    public User User { get; set; } = null!;

    public DateTime JoinedAt { get; set; } = DateTime.UtcNow;
    public bool IsDeleted { get; set; } = false;
    public DateTime? LastReadAt { get; set; }
}

public class Message
{
    public int MessageId { get; set; }
    public int ChatId { get; set; }
    public Chat Chat { get; set; } = null!;

    public int SenderId { get; set; }
    public User Sender { get; set; } = null!;

    public string Content { get; set; } = null!;
    public DateTime SentAt { get; set; } = DateTime.UtcNow;
    public bool IsDeleted { get; set; } = false;
}