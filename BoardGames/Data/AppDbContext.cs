using Microsoft.EntityFrameworkCore;

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

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<User>(entity =>
        {
            entity.HasKey(u => u.UserId);
            entity.HasIndex(u => u.Login).IsUnique();
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
    }
}