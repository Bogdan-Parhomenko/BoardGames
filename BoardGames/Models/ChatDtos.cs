namespace BoardGamesApi.Models;

public class ChatDto
{
    public int ChatId { get; set; }
    public string ChatType { get; set; } = null!;
    public int? EventId { get; set; }
    public string? EventTitle { get; set; }
    public string ChatName { get; set; } = null!;
    public string? ChatPhoto { get; set; }
    public MessageDto? LastMessage { get; set; }
    public int UnreadCount { get; set; }
    public List<ChatParticipantDto> Participants { get; set; } = new();
}

public class ChatParticipantDto
{
    public int UserId { get; set; }
    public string FullName { get; set; } = null!;
    public string? Photo { get; set; }
}

public class MessageDto
{
    public int MessageId { get; set; }
    public int ChatId { get; set; }
    public int SenderId { get; set; }
    public string SenderName { get; set; } = null!;
    public string? SenderPhoto { get; set; }
    public string Content { get; set; } = null!;
    public DateTime SentAt { get; set; }
    public bool IsDeleted { get; set; }
    public bool IsOwn { get; set; }
}

public class SendMessageRequest
{
    public int SenderId { get; set; }
    public string Content { get; set; } = null!;
}

public class CreatePrivateChatRequest
{
    public int UserId { get; set; }
    public int OtherUserId { get; set; }
}

public class GetOrCreateEventChatRequest
{
    public int UserId { get; set; }
    public int EventId { get; set; }
}

public class ChatMessagesResponse
{
    public ChatDto Chat { get; set; } = null!;
    public List<MessageDto> Messages { get; set; } = new();
}