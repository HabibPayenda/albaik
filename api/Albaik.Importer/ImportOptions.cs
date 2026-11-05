namespace Albaik.Importer;

/// <summary>Everything the one-off import needs. The source is only ever read.</summary>
public sealed record ImportOptions
{
    /// <summary>Path to the live SQLite file. The importer copies it before reading.</summary>
    public required string SourcePath { get; init; }

    /// <summary>MariaDB connection string. The schema must already exist unless <see cref="ApplyMigrations"/> is set.</summary>
    public required string TargetConnectionString { get; init; }

    /// <summary>Truncate the target's imported tables instead of refusing a non-empty target.</summary>
    public bool Force { get; init; }

    /// <summary>Apply the API's EF migrations before importing, for a database that is still empty.</summary>
    public bool ApplyMigrations { get; init; }
}

/// <summary>Per-table proof that what landed in MariaDB is what was read from SQLite.</summary>
public sealed record TableImportReport(
    string Table,
    int SourceRows,
    int TargetRows,
    string SourceChecksum,
    string TargetChecksum)
{
    public bool Matches =>
        SourceRows == TargetRows &&
        string.Equals(SourceChecksum, TargetChecksum, StringComparison.Ordinal);
}

public sealed record ImportReport(IReadOnlyList<TableImportReport> Tables, int VerificationCodesChecked)
{
    public bool Succeeded => Tables.All(t => t.Matches);
}

/// <summary>The target already holds rows and <see cref="ImportOptions.Force"/> was not set.</summary>
public sealed class ImportRefusedException : Exception
{
    public ImportRefusedException(string message) : base(message) { }
}

/// <summary>The SQLite file could not be read into the shared model.</summary>
public sealed class ImportSourceException : Exception
{
    public ImportSourceException(string message) : base(message) { }
    public ImportSourceException(string message, Exception innerException) : base(message, innerException) { }
}

/// <summary>The target was written but does not match the source, so success cannot be reported.</summary>
public sealed class ImportVerificationException : Exception
{
    public ImportVerificationException(string message) : base(message) { }
}
