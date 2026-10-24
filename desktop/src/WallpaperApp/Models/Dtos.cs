using System.Text.Json.Serialization;

namespace WallpaperApp.Models;

// Espelha os contratos de shared/src/types.ts e api.ts.

public enum WallpaperKind { Image, Video }

public sealed class WallpaperDto
{
    [JsonPropertyName("id")] public string Id { get; set; } = "";
    [JsonPropertyName("title")] public string Title { get; set; } = "";
    [JsonPropertyName("description")] public string? Description { get; set; }
    [JsonPropertyName("categoryId")] public string? CategoryId { get; set; }
    [JsonPropertyName("type")] public string Type { get; set; } = "image";
    [JsonPropertyName("status")] public string Status { get; set; } = "published";
    [JsonPropertyName("featured")] public bool Featured { get; set; }
    [JsonPropertyName("fileUrl")] public string FileUrl { get; set; } = "";
    [JsonPropertyName("thumbnailUrl")] public string? ThumbnailUrl { get; set; }
    [JsonPropertyName("resolutionWidth")] public int? ResolutionWidth { get; set; }
    [JsonPropertyName("resolutionHeight")] public int? ResolutionHeight { get; set; }
    [JsonPropertyName("fileSize")] public long? FileSize { get; set; }
    [JsonPropertyName("duration")] public double? Duration { get; set; }
    [JsonPropertyName("downloadCount")] public long DownloadCount { get; set; }
    [JsonPropertyName("tags")] public List<string> Tags { get; set; } = new();
    [JsonPropertyName("publishedAt")] public string? PublishedAt { get; set; }

    [JsonIgnore] public WallpaperKind Kind => Type == "video" ? WallpaperKind.Video : WallpaperKind.Image;
    [JsonIgnore] public string ResolutionLabel =>
        ResolutionWidth is int w && ResolutionHeight is int h
            ? (w >= 3840 || h >= 2160 ? "4K" : $"{w}x{h}")
            : "—";
}

public sealed class CategoryDto
{
    [JsonPropertyName("id")] public string Id { get; set; } = "";
    [JsonPropertyName("name")] public string Name { get; set; } = "";
    [JsonPropertyName("slug")] public string Slug { get; set; } = "";
    [JsonPropertyName("icon")] public string? Icon { get; set; }
    [JsonPropertyName("sortOrder")] public int SortOrder { get; set; }
}

public sealed class PaginatedDto<T>
{
    [JsonPropertyName("items")] public List<T> Items { get; set; } = new();
    [JsonPropertyName("page")] public int Page { get; set; }
    [JsonPropertyName("pageSize")] public int PageSize { get; set; }
    [JsonPropertyName("total")] public int Total { get; set; }
    [JsonPropertyName("totalPages")] public int TotalPages { get; set; }
    [JsonPropertyName("hasMore")] public bool HasMore { get; set; }
    [JsonPropertyName("serverTime")] public string? ServerTime { get; set; }
}

public sealed class CategoryListDto
{
    [JsonPropertyName("items")] public List<CategoryDto> Items { get; set; } = new();
}

public sealed class RegisterDownloadResult
{
    [JsonPropertyName("ok")] public bool Ok { get; set; }
    [JsonPropertyName("counted")] public bool Counted { get; set; }
    [JsonPropertyName("downloadCount")] public long DownloadCount { get; set; }
}

// Registro local de um wallpaper já baixado (biblioteca offline).
public sealed class LibraryEntry
{
    public string Id { get; set; } = "";
    public string Title { get; set; } = "";
    public string Type { get; set; } = "image";
    public string LocalPath { get; set; } = "";
    public string? ThumbnailUrl { get; set; }
    public int? ResolutionWidth { get; set; }
    public int? ResolutionHeight { get; set; }
    public bool Favorite { get; set; }
    public DateTimeOffset AddedAt { get; set; } = DateTimeOffset.Now;
    public DateTimeOffset? LastAppliedAt { get; set; }

    [JsonIgnore] public WallpaperKind Kind => Type == "video" ? WallpaperKind.Video : WallpaperKind.Image;
}
