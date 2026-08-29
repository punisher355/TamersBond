# build-rulebook.ps1 — converts Books/*.md to packs/rulebook.db

$booksDir = "$PSScriptRoot\Books"
$outFile   = "$PSScriptRoot\packs\rulebook.db"

# Ordered list of files to include (chapter order)
$files = @(
  "001_The_World.md",
  "002_Overview.md",
  "003_Who_Is_A_Tamer.md",
  "004_Classes.md",
  "005_Crest_Stats_and_Hope.md",
  "006_Skills.md",
  "007_Who_Is_Your_Digimon.md",
  "008_Digimon_Crest_Stats.md",
  "009_Growth_and_Experience.md",
  "010_Combat.md",
  "011_Attacks_and_Tags.md",
  "012_Digivolution.md",
  "013_Resting_and_Encounters.md",
  "014_Defeat_Victory_and_Tamer_Conditions.md",
  "015_Items.md",
  "016_Appendix_Quick_Reference.md",
  "100_DNA_Digivolution.md",
  "200_Rules_Armor_Digivolution.md",
  "300_Rules_Biomerge_and_Card_Slash.md",
  "400_Spirit_Tamer.md",
  "500_Rules_Burst_Digivolution.md"
)

# Page IDs (stable 16-char hex)
$pageIds = @(
  "rb001theworld0001",
  "rb002overview0002",
  "rb003whoisatamer03",
  "rb004classes00004",
  "rb005creststatshp5",
  "rb006skills000006",
  "rb007whoismydigim7",
  "rb008digimonstats8",
  "rb009growthexp009",
  "rb010combat000010",
  "rb011attackstags11",
  "rb012digivolution2",
  "rb013resting00013",
  "rb014defeatvict14",
  "rb015items0000015",
  "rb016appendix0016",
  "rb100dnadigi00100",
  "rb200armordigi0200",
  "rb300biomerge0300",
  "rb400spirittam400",
  "rb500burstdigi500"
)

function Escape-Json([string]$s) {
  $s = $s -replace '\\', '\\'
  $s = $s -replace '"',  '\"'
  $s = $s -replace "`r", ''
  $s = $s -replace "`n", '\n'
  $s = $s -replace "`t", '\t'
  return $s
}

function Inline-Format([string]$line) {
  # bold before italic
  $line = [regex]::Replace($line, '\*\*(.+?)\*\*', '<strong>$1</strong>')
  $line = [regex]::Replace($line, '\*(.+?)\*',     '<em>$1</em>')
  $line = [regex]::Replace($line, '`(.+?)`',        '<code>$1</code>')
  return $line
}

function Convert-MdToHtml([string[]]$lines) {
  $html   = [System.Text.StringBuilder]::new()
  $i      = 0
  $n      = $lines.Count

  while ($i -lt $n) {
    $line = $lines[$i]

    # Blank line
    if ($line.Trim() -eq '') { $i++; continue }

    # Headings
    if ($line -match '^# (.+)$')   { $null = $html.Append("<h1>$(Inline-Format $Matches[1])</h1>`n"); $i++; continue }
    if ($line -match '^## (.+)$')  { $null = $html.Append("<h2>$(Inline-Format $Matches[1])</h2>`n"); $i++; continue }
    if ($line -match '^### (.+)$') { $null = $html.Append("<h3>$(Inline-Format $Matches[1])</h3>`n"); $i++; continue }

    # Horizontal rule
    if ($line -match '^---+$') { $null = $html.Append("<hr />`n"); $i++; continue }

    # Blockquote block
    if ($line -match '^> ') {
      $null = $html.Append("<blockquote>")
      while ($i -lt $n -and ($lines[$i] -match '^> ' -or $lines[$i].Trim() -eq '')) {
        if ($lines[$i] -match '^> (.*)$') {
          $bLine = $Matches[1]
          if ($bLine -match '^#{1,3} (.+)$') {
            $lvl = ($bLine -replace '[^#]','').Length
            $null = $html.Append("<h$lvl>$(Inline-Format ($bLine -replace '^#+\s+',''))</h$lvl>")
          } elseif ($bLine.Trim() -eq '') {
            # skip blank inside blockquote
          } else {
            $null = $html.Append("<p>$(Inline-Format $bLine)</p>")
          }
        }
        $i++
      }
      $null = $html.Append("</blockquote>`n")
      continue
    }

    # Table block
    if ($line -match '^\|') {
      $tableLines = @()
      while ($i -lt $n -and $lines[$i] -match '^\|') {
        $tableLines += $lines[$i]
        $i++
      }
      # Filter out separator rows (|---|---|)
      $dataRows = $tableLines | Where-Object { $_ -notmatch '^\|\s*[-:]+\s*(\|\s*[-:]+\s*)+\|?\s*$' }
      if ($dataRows.Count -gt 0) {
        $null = $html.Append("<table><tbody>`n")
        $rowIdx = 0
        foreach ($tr in $dataRows) {
          $cells = $tr -split '\|' | Where-Object { $_ -ne '' } | ForEach-Object { $_.Trim() }
          if ($rowIdx -eq 0) {
            $null = $html.Append("<tr>")
            foreach ($c in $cells) { $null = $html.Append("<th>$(Inline-Format $c)</th>") }
            $null = $html.Append("</tr>`n")
          } else {
            $null = $html.Append("<tr>")
            foreach ($c in $cells) { $null = $html.Append("<td>$(Inline-Format $c)</td>") }
            $null = $html.Append("</tr>`n")
          }
          $rowIdx++
        }
        $null = $html.Append("</tbody></table>`n")
      }
      continue
    }

    # Unordered list block
    if ($line -match '^[\*\-] ') {
      $null = $html.Append("<ul>`n")
      while ($i -lt $n -and $lines[$i] -match '^[\*\-] (.+)$') {
        $null = $html.Append("<li>$(Inline-Format $Matches[1])</li>`n")
        $i++
      }
      $null = $html.Append("</ul>`n")
      continue
    }

    # Ordered list block
    if ($line -match '^\d+\. ') {
      $null = $html.Append("<ol>`n")
      while ($i -lt $n -and $lines[$i] -match '^\d+\. (.+)$') {
        $null = $html.Append("<li>$(Inline-Format $Matches[1])</li>`n")
        $i++
      }
      $null = $html.Append("</ol>`n")
      continue
    }

    # Default: paragraph
    $null = $html.Append("<p>$(Inline-Format $line)</p>`n")
    $i++
  }

  return $html.ToString()
}

# ---- Build pages array ----
$pages = [System.Collections.Generic.List[string]]::new()

for ($fi = 0; $fi -lt $files.Count; $fi++) {
  $path = Join-Path $booksDir $files[$fi]
  if (-not (Test-Path $path)) { Write-Warning "Missing: $path"; continue }

  $rawLines = Get-Content $path -Encoding UTF8

  # Derive page name from first H1 or H2, strip markdown bold markers
  $pageName = ($rawLines | Where-Object { $_ -match '^#{1,2} ' } | Select-Object -First 1) -replace '^#{1,2} ',''
  $pageName = $pageName -replace '\*\*',''
  if (-not $pageName) { $pageName = [IO.Path]::GetFileNameWithoutExtension($files[$fi]) }
  # Override names for special chapters
  $nameOverrides = @{
    "100_DNA_Digivolution.md"             = "DNA Digivolution"
    "200_Rules_Armor_Digivolution.md"     = "A New Destiny: Armor Digivolution"
    "300_Rules_Biomerge_and_Card_Slash.md"= "A New Destiny: Biomerge & Card Slash"
    "400_Spirit_Tamer.md"                 = "Spirit Tamer"
    "500_Rules_Burst_Digivolution.md"     = "Data Squad: Burst Digivolution"
  }
  if ($nameOverrides.ContainsKey($files[$fi])) { $pageName = $nameOverrides[$files[$fi]] }

  $htmlBody = Convert-MdToHtml -lines $rawLines
  $escapedHtml  = Escape-Json $htmlBody
  $escapedName  = Escape-Json $pageName
  $pageId = $pageIds[$fi]

  $pageJson = "{`"_id`":`"$pageId`",`"name`":`"$escapedName`",`"type`":`"text`",`"title`":{`"show`":false,`"level`":1},`"image`":{},`"text`":{`"format`":1,`"content`":`"$escapedHtml`"},`"video`":{`"controls`":true,`"volume`":0.5},`"src`":null,`"system`":{},`"sort`":$(($fi+1)*100),`"ownership`":{`"default`":-1},`"flags`":{}}"
  $pages.Add($pageJson)
}

$pagesJson = $pages -join ','
$doc = "{`"_id`":`"9a9b1151914ebc1d`",`"name`":`"Tamer's Bond Core Rulebook`",`"pages`":[$pagesJson],`"folder`":null,`"sort`":0,`"ownership`":{`"default`":0},`"flags`":{},`"_stats`":{`"systemId`":`"digital-destiny`",`"systemVersion`":`"1.2.5`",`"coreVersion`":`"11`",`"createdTime`":null,`"modifiedTime`":null,`"lastModifiedBy`":null}}"

[System.IO.File]::WriteAllText($outFile, $doc, [System.Text.UTF8Encoding]::new($false))
Write-Host "Written: $outFile  ($($pages.Count) pages)"
