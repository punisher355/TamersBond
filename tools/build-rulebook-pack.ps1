# build-rulebook-pack.ps1
# Reads Books/*.md files and writes the Core Rulebook as a JournalEntry compendium pack.
#
# HOW TO RUN: double-click  tools\rebuild-rulebook-pack.bat
#
# AFTER RUNNING:
#   1. Close Foundry VTT (if open)
#   2. Say Y to delete the LevelDB cache when prompted
#   3. Reopen Foundry - the Rulebook compendium will appear in the Compendium tab

$ErrorActionPreference = "Stop"

$root     = Split-Path $PSScriptRoot -Parent
$booksDir = Join-Path $root "Books"
$packsDir = Join-Path $root "packs"
$outFile  = Join-Path $packsDir "rulebook.db"
$lvlDir   = Join-Path $packsDir "rulebook"

function Get-StableId($str) {
    $bytes = [System.Text.Encoding]::UTF8.GetBytes($str.ToLower())
    $hash  = [System.Security.Cryptography.SHA256]::Create().ComputeHash($bytes)
    return ($hash[0..7] | ForEach-Object { '{0:x2}' -f $_ }) -join ''
}

# ── Inline markdown → HTML ────────────────────────────────────────────────────
function Format-Inline($text) {
    $text = $text -replace '&', '&amp;'
    $text = $text -replace '<', '&lt;'
    $text = $text -replace '>', '&gt;'
    # Bold before italic to avoid conflicts
    $text = [regex]::Replace($text, '\*\*(.+?)\*\*', '<strong>$1</strong>')
    $text = [regex]::Replace($text, '(?<!\*)\*([^*\r\n]+?)\*(?!\*)', '<em>$1</em>')
    return $text
}

# ── Table helpers ─────────────────────────────────────────────────────────────
function Test-SeparatorRow($row) {
    return $row -match '^\|\s*:?-+:?\s*(\|\s*:?-+:?\s*)*\|?\s*$'
}

function Parse-TableRow($row) {
    $row = $row.Trim()
    if ($row.StartsWith('|')) { $row = $row.Substring(1) }
    if ($row.EndsWith('|'))   { $row = $row.Substring(0, $row.Length - 1) }
    return $row.Split('|') | ForEach-Object { Format-Inline $_.Trim() }
}

function Convert-TableToHtml($tableLines) {
    $sepIdx = -1
    for ($j = 0; $j -lt $tableLines.Count; $j++) {
        if (Test-SeparatorRow $tableLines[$j]) { $sepIdx = $j; break }
    }

    $sb = [System.Text.StringBuilder]::new()
    $null = $sb.Append('<table><tbody>')
    for ($j = 0; $j -lt $tableLines.Count; $j++) {
        if ($j -eq $sepIdx) { continue }
        $cells = Parse-TableRow $tableLines[$j]
        $tag   = if ($sepIdx -ge 0 -and $j -lt $sepIdx) { 'th' } else { 'td' }
        $null = $sb.Append('<tr>')
        foreach ($c in $cells) { $null = $sb.Append("<$tag>$c</$tag>") }
        $null = $sb.Append('</tr>')
    }
    $null = $sb.Append('</tbody></table>')
    return $sb.ToString()
}

# ── Block-level markdown → HTML (recursive so blockquotes handle inner tables) ─
function Convert-MdToHtml($markdown) {
    $lines  = $markdown -split "`r?`n"
    $output = [System.Collections.Generic.List[string]]::new()
    $i      = 0

    while ($i -lt $lines.Length) {
        $line = $lines[$i]

        # blank line – skip
        if ([string]::IsNullOrWhiteSpace($line)) { $i++; continue }

        # heading  #  ##  ###  ####
        if ($line -match '^(#{1,4})\s+(.+)$') {
            $level = $matches[1].Length
            # strip outer ** if present (e.g. # **Chapter 10: …**)
            $raw   = $matches[2].Trim() -replace '^\*\*(.+)\*\*$', '$1'
            $output.Add("<h$level>$(Format-Inline $raw)</h$level>")
            $i++
            continue
        }

        # standalone horizontal rule  ---  (not a table separator)
        if ($line.Trim() -match '^-{3,}$') {
            $prevIsTable = ($i -gt 0)                            -and ($lines[$i-1] -match '^\|')
            $nextIsTable = ($i+1 -lt $lines.Length)             -and ($lines[$i+1] -match '^\|')
            if (-not $prevIsTable -and -not $nextIsTable) {
                $output.Add('<hr />')
                $i++
                continue
            }
        }

        # table (handles both regular and blockquote-stripped lines)
        if ($line -match '^\|') {
            $tbl = [System.Collections.Generic.List[string]]::new()
            while ($i -lt $lines.Length -and $lines[$i] -match '^\|') {
                $tbl.Add($lines[$i])
                $i++
            }
            $output.Add((Convert-TableToHtml $tbl))
            continue
        }

        # blockquote  > …
        if ($line -match '^>') {
            $bq = [System.Collections.Generic.List[string]]::new()
            while ($i -lt $lines.Length -and (
                    $lines[$i] -match '^>' -or
                    ([string]::IsNullOrWhiteSpace($lines[$i]) -and
                     $i+1 -lt $lines.Length -and $lines[$i+1] -match '^>')
            )) {
                # strip leading '> ' or '>'
                $bq.Add(($lines[$i] -replace '^>\s?', ''))
                $i++
            }
            # recursively convert blockquote inner content
            $inner = Convert-MdToHtml ($bq -join "`n")
            $output.Add("<blockquote>$inner</blockquote>")
            continue
        }

        # unordered list  - item
        if ($line -match '^[-*]\s') {
            $items = [System.Collections.Generic.List[string]]::new()
            while ($i -lt $lines.Length -and $lines[$i] -match '^[-*]\s') {
                $stripped = $lines[$i] -replace '^[-*]\s+', ''
                $items.Add((Format-Inline $stripped))
                $i++
            }
            $html = '<ul>' + (($items | ForEach-Object { "<li>$_</li>" }) -join '') + '</ul>'
            $output.Add($html)
            continue
        }

        # paragraph – collect consecutive non-special lines
        $para = [System.Collections.Generic.List[string]]::new()
        while ($i -lt $lines.Length -and
               -not [string]::IsNullOrWhiteSpace($lines[$i]) -and
               -not ($lines[$i] -match '^#{1,4}\s') -and
               -not ($lines[$i] -match '^\|') -and
               -not ($lines[$i] -match '^>') -and
               -not ($lines[$i] -match '^[-*]\s') -and
               -not ($lines[$i].Trim() -match '^-{3,}$')) {
            $para.Add($lines[$i])
            $i++
        }
        if ($para.Count -gt 0) {
            $output.Add('<p>' + (Format-Inline ($para -join ' ')) + '</p>')
        }
    }

    return ($output -join "`n").Trim()
}

# ── Build journal ─────────────────────────────────────────────────────────────

Write-Host ""
Write-Host "  Building Core Rulebook journal from Books/ markdown files..." -ForegroundColor Cyan

$bookFiles = Get-ChildItem -Path $booksDir -Filter "*.md" | Sort-Object Name

$journalId  = Get-StableId "tamers-bond-core-rulebook"
$builtPages = [System.Collections.Generic.List[object]]::new()
$sort       = 0

foreach ($file in $bookFiles) {
    $mdContent = Get-Content $file.FullName -Raw -Encoding UTF8

    # Page title from first H1 (strip outer ** if any)
    $m = [regex]::Match($mdContent, '^#\s+\*?\*?(.+?)\*?\*?\s*$', [System.Text.RegularExpressions.RegexOptions]::Multiline)
    if (-not $m.Success) {
        Write-Host ("    ! Skipping {0} - no H1 heading found" -f $file.Name) -ForegroundColor Yellow
        continue
    }
    $pageTitle = $m.Groups[1].Value.Trim()

    $htmlContent = Convert-MdToHtml $mdContent

    $sort += 100000
    $pageId = Get-StableId ("rulebook::" + $pageTitle)

    $pageObj = [ordered]@{
        _id      = $pageId
        name     = $pageTitle
        type     = "text"
        title    = [ordered]@{ show = $false; level = 1 }
        image    = [ordered]@{}
        text     = [ordered]@{
            format   = 1
            content  = $htmlContent
            markdown = ""
        }
        video    = [ordered]@{ controls = $true; volume = 0.5 }
        src      = $null
        system   = [ordered]@{}
        sort     = $sort
        ownership = [ordered]@{ default = -1 }
        flags    = [ordered]@{}
    }
    $builtPages.Add($pageObj)
    Write-Host ("    + {0}" -f $pageTitle) -ForegroundColor Gray
}

$journal = [ordered]@{
    _id       = $journalId
    name      = "Tamer's Bond Core Rulebook"
    pages     = $builtPages.ToArray()
    ownership = [ordered]@{ default = 1 }
    flags     = [ordered]@{}
    folder    = $null
    sort      = 0
}

$utf8 = New-Object System.Text.UTF8Encoding $false
$json = $journal | ConvertTo-Json -Compress -Depth 20
[System.IO.File]::WriteAllText($outFile, $json + "`n", $utf8)

Write-Host ""
Write-Host ("  Wrote {0} pages -> packs\rulebook.db" -f $builtPages.Count) -ForegroundColor Green

# ── LevelDB cache cleanup ─────────────────────────────────────────────────────

Write-Host ""
if (Test-Path $lvlDir) {
    Write-Host "  Found LevelDB cache: packs\rulebook" -ForegroundColor Yellow
    $answer = Read-Host "  Delete it so Foundry picks up the new data? (Y/N)"
    if ($answer -match '^[Yy]') {
        Remove-Item $lvlDir -Recurse -Force
        Write-Host "  Cache deleted." -ForegroundColor Green
        Write-Host ""
        Write-Host "  Done! Restart Foundry VTT and the Rulebook compendium will be ready." -ForegroundColor Green
    } else {
        Write-Host ""
        Write-Host "  Remember to delete packs\rulebook\ before restarting Foundry." -ForegroundColor Yellow
    }
} else {
    Write-Host "  Done! Start Foundry VTT and the Rulebook compendium will compile automatically." -ForegroundColor Green
}

Write-Host ""
