using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage.ValueConversion;

namespace BoardGamesApi.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options)
        : base(options)
    {
    }

    public DbSet<User> Users => Set<User>();
    public DbSet<GameCategory> GameCategories => Set<GameCategory>();
    public DbSet<GameEvent> GameEvents => Set<GameEvent>();
    public DbSet<UserEventParticipation> UserEventParticipations => Set<UserEventParticipation>();
    public DbSet<FavoriteEvent> FavoriteEvents => Set<FavoriteEvent>();

    public DbSet<Chat> Chats => Set<Chat>();
    public DbSet<ChatParticipant> ChatParticipants => Set<ChatParticipant>();
    public DbSet<Message> Messages => Set<Message>();

    public DbSet<UserReview> UserReviews => Set<UserReview>();

    public DbSet<Notification> Notifications => Set<Notification>();
    public DbSet<ReviewBan> ReviewBans => Set<ReviewBan>();
    public DbSet<UserBan> UserBans => Set<UserBan>();
    public DbSet<Complaint> Complaints => Set<Complaint>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<User>(entity =>
        {
            entity.HasKey(u => u.UserId);
            entity.HasIndex(u => u.Login).IsUnique();
            entity.HasIndex(u => u.VkId).IsUnique();
        });

        modelBuilder.Entity<GameCategory>(entity =>
        {
            entity.HasKey(c => c.CategoryId);
            entity.HasIndex(c => c.Name).IsUnique();
        });

        modelBuilder.Entity<GameEvent>(entity =>
        {
            entity.HasKey(e => e.EventId);
            entity.Property(e => e.MaxPlayers).IsRequired();
            entity.ToTable(tb =>
            {
                tb.HasCheckConstraint(
                    "CK_GameEvents_MaxPlayers_Positive",
                    "max_players > 0");
            });

            entity.HasOne(e => e.Creator)
                .WithMany(u => u.CreatedEvents)
                .HasForeignKey(e => e.CreatorId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasMany(e => e.Categories)
                .WithMany(c => c.Events)
                .UsingEntity<Dictionary<string, object>>(
                    "event_game_categories",

                    j => j
                        .HasOne<GameCategory>()
                        .WithMany()
                        .HasForeignKey("category_id")
                        .HasConstraintName("fk_event_game_categories_category_id")
                        .OnDelete(DeleteBehavior.Cascade),

                    j => j
                        .HasOne<GameEvent>()
                        .WithMany()
                        .HasForeignKey("event_id")
                        .HasConstraintName("fk_event_game_categories_event_id")
                        .OnDelete(DeleteBehavior.Cascade),

                    j =>
                    {
                        j.ToTable("event_game_categories");
                        j.HasKey("event_id", "category_id");
                    });
        });

        modelBuilder.Entity<UserEventParticipation>(entity =>
        {
            entity.HasKey(p => new { p.UserId, p.EventId });

            entity.HasOne(p => p.User)
                .WithMany(u => u.EventParticipations)
                .HasForeignKey(p => p.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(p => p.GameEvent)
                .WithMany(e => e.Participants)
                .HasForeignKey(p => p.EventId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<FavoriteEvent>(entity =>
        {
            entity.HasKey(f => f.FavoriteEventId);

            entity.HasOne(f => f.Creator)
                .WithMany(u => u.FavoriteEvents)
                .HasForeignKey(f => f.CreatorId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<Chat>(entity =>
        {
            entity.HasKey(c => c.ChatId);

            entity.Property(c => c.ChatType)
                .HasConversion(
                    v => v.ToString(),
                    v => (ChatType)Enum.Parse(typeof(ChatType), v))
                .HasMaxLength(7);

            entity.HasOne(c => c.Event)
                .WithMany()
                .HasForeignKey(c => c.EventId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<ChatParticipant>(entity =>
        {
            entity.HasKey(cp => new { cp.ChatId, cp.UserId });

            entity.HasOne(cp => cp.Chat)
                .WithMany(c => c.Participants)
                .HasForeignKey(cp => cp.ChatId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(cp => cp.User)
                .WithMany(u => u.ChatParticipants)
                .HasForeignKey(cp => cp.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<Message>(entity =>
        {
            entity.HasKey(m => m.MessageId);

            entity.HasOne(m => m.Chat)
                .WithMany(c => c.Messages)
                .HasForeignKey(m => m.ChatId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(m => m.Sender)
                .WithMany(u => u.SentMessages)
                .HasForeignKey(m => m.SenderId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<UserReview>(entity =>
        {
            entity.HasKey(r => r.ReviewId);

            entity.Property(r => r.Rating)
                .HasConversion<string>()
                .HasMaxLength(20);

            entity.HasOne(r => r.Reviewer)
                .WithMany(u => u.ReviewsWritten)
                .HasForeignKey(r => r.ReviewerId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(r => r.TargetUser)
                .WithMany(u => u.ReviewsReceived)
                .HasForeignKey(r => r.TargetUserId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasIndex(r => new { r.ReviewerId, r.TargetUserId }).IsUnique();
        });

        modelBuilder.Entity<Notification>(entity =>
        {
            entity.HasKey(n => n.NotificationId);

            entity.HasOne(n => n.User)
                .WithMany(u => u.Notifications)
                .HasForeignKey(n => n.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<ReviewBan>(entity =>
        {
            entity.HasKey(b => b.BanId);

            entity.HasOne(b => b.User)
                .WithMany(u => u.ReviewBans)
                .HasForeignKey(b => b.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(b => b.Admin)
                .WithMany()
                .HasForeignKey(b => b.BannedBy)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<UserBan>(entity =>
        {
            entity.HasKey(b => b.BanId);

            entity.HasOne(b => b.User)
                .WithMany(u => u.UserBans)
                .HasForeignKey(b => b.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(b => b.Admin)
                .WithMany()
                .HasForeignKey(b => b.BannedBy)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<Complaint>(entity =>
        {
            entity.HasKey(c => c.ComplaintId);

            entity.HasOne(c => c.Reporter)
                .WithMany(u => u.Complaints)
                .HasForeignKey(c => c.ReporterId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(c => c.TargetEvent)
                .WithMany()
                .HasForeignKey(c => c.TargetEventId)
                .OnDelete(DeleteBehavior.SetNull);

            entity.HasOne(c => c.TargetReview)
                .WithMany()
                .HasForeignKey(c => c.TargetReviewId)
                .OnDelete(DeleteBehavior.SetNull);
        });
    }
}