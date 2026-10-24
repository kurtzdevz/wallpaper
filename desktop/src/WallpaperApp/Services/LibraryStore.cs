using System.IO;
using System.Text.Json;
using WallpaperApp.Models;

namespace WallpaperApp.Services;

// Biblioteca local persistida (funciona offline). Guarda o que foi baixado,
// favoritos e o histórico de aplicação.
public sealed class LibraryStore
{
    private readonly string _path = Path.Combine(AppConfig.DataDir, "library.json");
    private static readonly JsonSerializerOptions Opts = new() { WriteIndented = true };
    private List<LibraryEntry> _entries = new();

    public LibraryStore() => Load();

    public IReadOnlyList<LibraryEntry> Entries => _entries;

    public LibraryEntry? Get(string id) => _entries.FirstOrDefault(e => e.Id == id);
    public bool IsDownloaded(string id) => _entries.Any(e => e.Id == id && File.Exists(e.LocalPath));

    public void Upsert(LibraryEntry entry)
    {
        var i = _entries.FindIndex(e => e.Id == entry.Id);
        if (i >= 0) _entries[i] = entry; else _entries.Add(entry);
        Save();
    }

    public void Remove(string id)
    {
        var e = Get(id);
        if (e != null)
        {
            try { if (File.Exists(e.LocalPath)) File.Delete(e.LocalPath); } catch { }
            _entries.RemoveAll(x => x.Id == id);
            Save();
        }
    }

    public void ToggleFavorite(string id)
    {
        var e = Get(id);
        if (e != null) { e.Favorite = !e.Favorite; Save(); }
    }

    public void MarkApplied(string id)
    {
        var e = Get(id);
        if (e != null) { e.LastAppliedAt = DateTimeOffset.Now; Save(); }
    }

    public long TotalBytes()
    {
        long sum = 0;
        foreach (var e in _entries)
            try { if (File.Exists(e.LocalPath)) sum += new FileInfo(e.LocalPath).Length; } catch { }
        return sum;
    }

    private void Load()
    {
        try
        {
            if (File.Exists(_path))
                _entries = JsonSerializer.Deserialize<List<LibraryEntry>>(File.ReadAllText(_path)) ?? new();
        }
        catch { _entries = new(); }
    }

    private void Save()
    {
        try { File.WriteAllText(_path, JsonSerializer.Serialize(_entries, Opts)); }
        catch { }
    }
}
