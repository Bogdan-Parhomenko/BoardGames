using BoardGamesApi.Data;
using BoardGamesApi.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace BoardGamesApi.Controllers;

[ApiController]
[Route("api/chats")]
public class ChatsController : ControllerBase
{
    private readonly AppDbContext _db;

    public ChatsController(AppDbContext db)
    {
        _db = db;
    }

    /// <summary>
    /// Получить все чаты пользователя
    /// </summary>
    [HttpGet("user/{userId:int}")]
    public async Task<ActionResult<List<ChatDto>>> GetUserChats(int userId)
    {
        var chats = await _db.ChatParticipants
            .Where(cp => cp.UserId == userId && !cp.IsDeleted)
            .Include(cp => cp.Chat)
                .ThenInclude(c => c.Participants)
                    .ThenInclude(p => p.User)
            .Include(cp => cp.Chat)
                .ThenInclude(c => c.Event)
            .Include(cp => cp.Chat)
                .ThenInclude(c => c.Messages.Where(m => !m.IsDeleted).OrderByDescending(m => m.SentAt).Take(1))
                    .ThenInclude(m => m.Sender)
            .Select(cp => cp.Chat)
            .ToListAsync();

        var result = new List<ChatDto>();

        foreach (var chat in chats)
        {
            var participant = chat.Participants.FirstOrDefault(p => p.UserId == userId);
            var lastReadAt = participant?.LastReadAt;

            var unreadCount = await _db.Messages
                .Where(m => m.ChatId == chat.ChatId &&
                           !m.IsDeleted &&
                           m.SenderId != userId &&
                           (lastReadAt == null || m.SentAt > lastReadAt))
                .CountAsync();

            var lastMessage = chat.Messages.FirstOrDefault();

            string chatName;
            string? chatPhoto = null;

            if (chat.ChatType == ChatType.Event)
            {
                chatName = chat.Event?.Title ?? "Групповой чат";
            }
            else
            {
                var otherParticipant = chat.Participants.FirstOrDefault(p => p.UserId != userId);
                chatName = otherParticipant?.User.FullName ?? "Неизвестный";
                chatPhoto = otherParticipant?.User.Photo;
            }

            result.Add(new ChatDto
            {
                ChatId = chat.ChatId,
                ChatType = chat.ChatType.ToString().ToLower(),
                EventId = chat.EventId,
                EventTitle = chat.Event?.Title,
                ChatName = chatName,
                ChatPhoto = chatPhoto,
                UnreadCount = unreadCount,
                LastMessage = lastMessage != null ? new MessageDto
                {
                    MessageId = lastMessage.MessageId,
                    ChatId = lastMessage.ChatId,
                    SenderId = lastMessage.SenderId,
                    SenderName = lastMessage.Sender.FullName,
                    Content = lastMessage.IsDeleted ? "Сообщение удалено" : lastMessage.Content,
                    SentAt = lastMessage.SentAt,
                    IsDeleted = lastMessage.IsDeleted,
                    IsOwn = lastMessage.SenderId == userId
                } : null,
                Participants = chat.Participants.Select(p => new ChatParticipantDto
                {
                    UserId = p.UserId,
                    FullName = p.User.FullName,
                    Photo = p.User.Photo
                }).ToList()
            });
        }

        return result.OrderByDescending(c => c.LastMessage?.SentAt ?? DateTime.MinValue).ToList();
    }

    /// <summary>
    /// Получить или создать личный чат
    /// </summary>
    [HttpPost("private")]
    public async Task<ActionResult<ChatDto>> GetOrCreatePrivateChat(CreatePrivateChatRequest request)
    {
        if (request.UserId == request.OtherUserId)
            return BadRequest("Нельзя создать чат с самим собой");

        if (!await _db.Users.AnyAsync(u => u.UserId == request.UserId))
            return BadRequest("Пользователь не найден");

        if (!await _db.Users.AnyAsync(u => u.UserId == request.OtherUserId))
            return BadRequest("Собеседник не найден");

        // Ищем существующий личный чат
        var existingChat = await _db.Chats
            .Include(c => c.Participants)
                .ThenInclude(p => p.User)
            .Where(c => c.ChatType == ChatType.Private)
            .Where(c => c.Participants.Any(p => p.UserId == request.UserId) &&
                       c.Participants.Any(p => p.UserId == request.OtherUserId))
            .FirstOrDefaultAsync();

        if (existingChat != null)
        {
            // Восстанавливаем участие если было удалено
            var participant = existingChat.Participants.FirstOrDefault(p => p.UserId == request.UserId);
            if (participant != null && participant.IsDeleted)
            {
                participant.IsDeleted = false;
                await _db.SaveChangesAsync();
            }

            var otherUser = existingChat.Participants.FirstOrDefault(p => p.UserId != request.UserId);

            return new ChatDto
            {
                ChatId = existingChat.ChatId,
                ChatType = "private",
                ChatName = otherUser?.User.FullName ?? "Неизвестный",
                ChatPhoto = otherUser?.User.Photo,
                Participants = existingChat.Participants.Select(p => new ChatParticipantDto
                {
                    UserId = p.UserId,
                    FullName = p.User.FullName,
                    Photo = p.User.Photo
                }).ToList()
            };
        }

        // Создаем новый чат
        var chat = new Chat
        {
            ChatType = ChatType.Private
        };

        _db.Chats.Add(chat);
        await _db.SaveChangesAsync();

        var participants = new List<ChatParticipant>
        {
            new() { ChatId = chat.ChatId, UserId = request.UserId },
            new() { ChatId = chat.ChatId, UserId = request.OtherUserId }
        };

        _db.ChatParticipants.AddRange(participants);
        await _db.SaveChangesAsync();

        var users = await _db.Users
            .Where(u => u.UserId == request.UserId || u.UserId == request.OtherUserId)
            .ToListAsync();

        var other = users.FirstOrDefault(u => u.UserId == request.OtherUserId);

        return new ChatDto
        {
            ChatId = chat.ChatId,
            ChatType = "private",
            ChatName = other?.FullName ?? "Неизвестный",
            ChatPhoto = other?.Photo,
            Participants = users.Select(u => new ChatParticipantDto
            {
                UserId = u.UserId,
                FullName = u.FullName,
                Photo = u.Photo
            }).ToList()
        };
    }

    /// <summary>
    /// Получить или создать чат события
    /// </summary>
    [HttpPost("event")]
    public async Task<ActionResult<ChatDto>> GetOrCreateEventChat(GetOrCreateEventChatRequest request)
    {
        var gameEvent = await _db.GameEvents
            .Include(e => e.Creator)
            .Include(e => e.Participants)
                .ThenInclude(p => p.User)
            .FirstOrDefaultAsync(e => e.EventId == request.EventId);

        if (gameEvent == null)
            return NotFound("Событие не найдено");

        // Проверяем, является ли пользователь участником или создателем
        var isParticipant = gameEvent.CreatorId == request.UserId ||
                           gameEvent.Participants.Any(p => p.UserId == request.UserId);

        if (!isParticipant)
            return BadRequest("Вы не являетесь участником этого события");

        // Ищем существующий чат события
        var existingChat = await _db.Chats
            .Include(c => c.Participants)
                .ThenInclude(p => p.User)
            .FirstOrDefaultAsync(c => c.ChatType == ChatType.Event && c.EventId == request.EventId);

        if (existingChat != null)
        {
            // Добавляем пользователя если его нет
            if (!existingChat.Participants.Any(p => p.UserId == request.UserId))
            {
                _db.ChatParticipants.Add(new ChatParticipant
                {
                    ChatId = existingChat.ChatId,
                    UserId = request.UserId
                });
                await _db.SaveChangesAsync();
            }
            else
            {
                // Восстанавливаем если удален
                var participant = existingChat.Participants.First(p => p.UserId == request.UserId);
                if (participant.IsDeleted)
                {
                    participant.IsDeleted = false;
                    await _db.SaveChangesAsync();
                }
            }

            return new ChatDto
            {
                ChatId = existingChat.ChatId,
                ChatType = "event",
                EventId = request.EventId,
                EventTitle = gameEvent.Title,
                ChatName = gameEvent.Title,
                Participants = existingChat.Participants.Select(p => new ChatParticipantDto
                {
                    UserId = p.UserId,
                    FullName = p.User.FullName,
                    Photo = p.User.Photo
                }).ToList()
            };
        }

        // Создаем новый чат
        var chat = new Chat
        {
            ChatType = ChatType.Event,
            EventId = request.EventId
        };

        _db.Chats.Add(chat);
        await _db.SaveChangesAsync();

        // Добавляем всех участников события и создателя
        var participantIds = new HashSet<int> { gameEvent.CreatorId };
        foreach (var p in gameEvent.Participants)
        {
            participantIds.Add(p.UserId);
        }

        foreach (var pid in participantIds)
        {
            _db.ChatParticipants.Add(new ChatParticipant
            {
                ChatId = chat.ChatId,
                UserId = pid
            });
        }

        await _db.SaveChangesAsync();

        var allUsers = await _db.Users
            .Where(u => participantIds.Contains(u.UserId))
            .ToListAsync();

        return new ChatDto
        {
            ChatId = chat.ChatId,
            ChatType = "event",
            EventId = request.EventId,
            EventTitle = gameEvent.Title,
            ChatName = gameEvent.Title,
            Participants = allUsers.Select(u => new ChatParticipantDto
            {
                UserId = u.UserId,
                FullName = u.FullName,
                Photo = u.Photo
            }).ToList()
        };
    }

    /// <summary>
    /// Получить сообщения чата
    /// </summary>
    [HttpGet("{chatId:int}/messages")]
    public async Task<ActionResult<ChatMessagesResponse>> GetMessages(int chatId, [FromQuery] int userId, [FromQuery] int skip = 0, [FromQuery] int take = 50)
    {
        var chat = await _db.Chats
            .Include(c => c.Participants)
                .ThenInclude(p => p.User)
            .Include(c => c.Event)
            .FirstOrDefaultAsync(c => c.ChatId == chatId);

        if (chat == null)
            return NotFound("Чат не найден");

        var participant = chat.Participants.FirstOrDefault(p => p.UserId == userId);
        if (participant == null || participant.IsDeleted)
            return BadRequest("Вы не являетесь участником этого чата");

        var messages = await _db.Messages
            .Where(m => m.ChatId == chatId)
            .OrderByDescending(m => m.SentAt)
            .Skip(skip)
            .Take(take)
            .Include(m => m.Sender)
            .ToListAsync();

        // Обновляем время последнего прочтения
        participant.LastReadAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        string chatName;
        string? chatPhoto = null;

        if (chat.ChatType == ChatType.Event)
        {
            chatName = chat.Event?.Title ?? "Групповой чат";
        }
        else
        {
            var other = chat.Participants.FirstOrDefault(p => p.UserId != userId);
            chatName = other?.User.FullName ?? "Неизвестный";
            chatPhoto = other?.User.Photo;
        }

        return new ChatMessagesResponse
        {
            Chat = new ChatDto
            {
                ChatId = chat.ChatId,
                ChatType = chat.ChatType.ToString().ToLower(),
                EventId = chat.EventId,
                EventTitle = chat.Event?.Title,
                ChatName = chatName,
                ChatPhoto = chatPhoto,
                Participants = chat.Participants.Select(p => new ChatParticipantDto
                {
                    UserId = p.UserId,
                    FullName = p.User.FullName,
                    Photo = p.User.Photo
                }).ToList()
            },
            Messages = messages.Select(m => new MessageDto
            {
                MessageId = m.MessageId,
                ChatId = m.ChatId,
                SenderId = m.SenderId,
                SenderName = m.Sender.FullName,
                SenderPhoto = m.Sender.Photo,
                Content = m.IsDeleted ? "Сообщение удалено" : m.Content,
                SentAt = m.SentAt,
                IsDeleted = m.IsDeleted,
                IsOwn = m.SenderId == userId
            }).Reverse().ToList()
        };
    }

    /// <summary>
    /// Отправить сообщение
    /// </summary>
    [HttpPost("{chatId:int}/messages")]
    public async Task<ActionResult<MessageDto>> SendMessage(int chatId, SendMessageRequest request)
    {
        var chat = await _db.Chats
            .Include(c => c.Participants)
            .FirstOrDefaultAsync(c => c.ChatId == chatId);

        if (chat == null)
            return NotFound("Чат не найден");

        var participant = chat.Participants.FirstOrDefault(p => p.UserId == request.SenderId);
        if (participant == null || participant.IsDeleted)
            return BadRequest("Вы не являетесь участником этого чата");

        if (string.IsNullOrWhiteSpace(request.Content))
            return BadRequest("Сообщение не может быть пустым");

        var sender = await _db.Users.FindAsync(request.SenderId);
        if (sender == null)
            return BadRequest("Отправитель не найден");

        var message = new Message
        {
            ChatId = chatId,
            SenderId = request.SenderId,
            Content = request.Content.Trim(),
            SentAt = DateTime.UtcNow
        };

        _db.Messages.Add(message);

        // Восстанавливаем удалённые чаты у других участников
        foreach (var p in chat.Participants.Where(p => p.IsDeleted && p.UserId != request.SenderId))
        {
            p.IsDeleted = false;
        }

        await _db.SaveChangesAsync();

        return new MessageDto
        {
            MessageId = message.MessageId,
            ChatId = message.ChatId,
            SenderId = message.SenderId,
            SenderName = sender.FullName,
            SenderPhoto = sender.Photo,
            Content = message.Content,
            SentAt = message.SentAt,
            IsDeleted = false,
            IsOwn = true
        };
    }

    /// <summary>
    /// Удалить сообщение (только своё)
    /// </summary>
    [HttpDelete("messages/{messageId:int}")]
    public async Task<IActionResult> DeleteMessage(int messageId, [FromQuery] int userId)
    {
        var message = await _db.Messages.FindAsync(messageId);

        if (message == null)
            return NotFound("Сообщение не найдено");

        if (message.SenderId != userId)
            return BadRequest("Вы можете удалить только свои сообщения");

        message.IsDeleted = true;
        await _db.SaveChangesAsync();

        return NoContent();
    }

    /// <summary>
    /// Удалить чат у себя (мягкое удаление)
    /// </summary>
    [HttpDelete("{chatId:int}")]
    public async Task<IActionResult> DeleteChat(int chatId, [FromQuery] int userId)
    {
        var participant = await _db.ChatParticipants
            .FirstOrDefaultAsync(cp => cp.ChatId == chatId && cp.UserId == userId);

        if (participant == null)
            return NotFound("Чат не найден");

        participant.IsDeleted = true;
        await _db.SaveChangesAsync();

        return NoContent();
    }

    /// <summary>
    /// Получить информацию о пользователе для начала чата
    /// </summary>
    [HttpGet("user-info/{userId:int}")]
    public async Task<ActionResult<ChatParticipantDto>> GetUserInfo(int userId)
    {
        var user = await _db.Users.FindAsync(userId);
        if (user == null)
            return NotFound("Пользователь не найден");

        return new ChatParticipantDto
        {
            UserId = user.UserId,
            FullName = user.FullName,
            Photo = user.Photo
        };
    }
}