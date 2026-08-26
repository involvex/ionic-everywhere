export function generateCompletions(shell: string): string {
	const lower = shell.toLowerCase()
	switch (lower) {
		case 'powershell':
		case 'pwsh':
			return powershellCompletions()
		case 'bash':
			return bashCompletions()
		case 'zsh':
			return zshCompletions()
		case 'fish':
			return fishCompletions()
		default:
			throw new Error(
				`Unsupported shell: ${shell}. Supported shells: powershell, bash, zsh, fish`,
			)
	}
}

function powershellCompletions(): string {
	return `
Register-ArgumentCompleter -CommandName 'ionic-everywhere', 'create-ionic-everywhere', 'ine' -ScriptBlock {
    param($commandName, $wordToComplete, $cursorPosition)

    $commands = @('new', 'add', 'doctor', 'list', 'upgrade', 'completions')
    $platforms = @('android', 'desktop', 'electron')
    $pms = @('bun', 'npm', 'pnpm', 'yarn')
    $shells = @('powershell', 'bash', 'zsh', 'fish')
    $globalFlags = @('--help', '--version')
    $newFlags = @('--name', '--app-id', '--pm', '--dir', '--template', '--yes', '--no-android', '--no-electron', '--no-install', '--no-git', '--tests', '--keep-on-failure')
    $addFlags = @('--dir', '--pm', '--install', '--yes', '--help')
    $listFlags = @('--dir', '--json', '--help')
    $upgradeFlags = @('--dir', '--pm', '--dry-run', '--force', '--yes', '--help')
    $doctorFlags = @('--json', '--help')
    $completionsArgs = @('powershell', 'bash', 'zsh', 'fish')

    $line = $executionContext.SessionState.InvokeCommand.ExpandString($input)
    # Fallback if $line is empty
    if (-not $line) {
        $line = $cursorPosition -ge 0 ? $host.UI.RawUI.ReadLine() : '' # approximate
    }

    # Better: split command line words
    $tokens = [System.Management.Automation.PSParser]::Tokenize($line, [ref]$null)
    $words = @($tokens | Where-Object { $_.Type -eq 'String' -or $_.Type -eq 'CommandArgument' -or $_.Type -eq 'Command' } | Select-Object -ExpandProperty Content)

    if ($words.Count -le 1) {
        return $commands | Where-Object { $_ -like "$wordToComplete*" } | ForEach-Object {
            [System.Management.Automation.CompletionResult]::new($_, $_, 'ParameterValue', $_)
        }
    }

    $subCommand = $words[1]

    # If subCommand is not one of the main commands, check if it's new (default action)
    if ($commands -notcontains $subCommand) {
        $subCommand = 'new'
    }

    $suggestions = @()
    switch ($subCommand) {
        'add' {
            if ($words.Count -eq 2) {
                $suggestions = $platforms
            } else {
                $suggestions = $addFlags
            }
        }
        'new' {
            if ($words -contains '--pm') {
                $suggestions = $pms
            } else {
                $suggestions = $newFlags
            }
        }
        'completions' {
            if ($words.Count -eq 2) {
                $suggestions = $shells
            }
        }
        'list' {
            $suggestions = $listFlags
        }
        'upgrade' {
            $suggestions = $upgradeFlags
        }
        'doctor' {
            $suggestions = $doctorFlags
        }
        default {
            $suggestions = $globalFlags
        }
    }

    $suggestions | Where-Object { $_ -like "$wordToComplete*" } | ForEach-Object {
        [System.Management.Automation.CompletionResult]::new($_, $_, 'ParameterValue', $_)
    }
}
`.trim()
}

function bashCompletions(): string {
	return `
_ionic_everywhere_completions() {
    local cur prev words cword
    _init_completion || return

    local commands="new add doctor list upgrade completions"
    local platforms="android desktop electron"
    local pms="bun npm pnpm yarn"
    local shells="powershell bash zsh fish"
    local new_flags="--name --app-id --pm --dir --template --yes --no-android --no-electron --no-install --no-git --tests --keep-on-failure --help --version"
    local add_flags="--dir --pm --install --yes --help"
    local list_flags="--dir --json --help"
    local upgrade_flags="--dir --pm --dry-run --force --yes --help"
    local doctor_flags="--json --help"

    if [ $cword -eq 1 ]; then
        COMPREPLY=( $(compgen -W "$commands" -- "$cur") )
        return
    fi

    local action="\${words[1]}"
    case "$action" in
        add)
            if [ $cword -eq 2 ]; then
                COMPREPLY=( $(compgen -W "$platforms" -- "$cur") )
            else
                COMPREPLY=( $(compgen -W "$add_flags" -- "$cur") )
            fi
            ;;
        new)
            if [ "$prev" = "--pm" ]; then
                COMPREPLY=( $(compgen -W "$pms" -- "$cur") )
            else
                COMPREPLY=( $(compgen -W "$new_flags" -- "$cur") )
            fi
            ;;
        completions)
            if [ $cword -eq 2 ]; then
                COMPREPLY=( $(compgen -W "$shells" -- "$cur") )
            fi
            ;;
        list)
            COMPREPLY=( $(compgen -W "$list_flags" -- "$cur") )
            ;;
        upgrade)
            COMPREPLY=( $(compgen -W "$upgrade_flags" -- "$cur") )
            ;;
        doctor)
            COMPREPLY=( $(compgen -W "$doctor_flags" -- "$cur") )
            ;;
        *)
            COMPREPLY=( $(compgen -W "$new_flags" -- "$cur") )
            ;;
    es}
}

complete -F _ionic_everywhere_completions ionic-everywhere create-ionic-everywhere ine
`.trim()
}

function zshCompletions(): string {
	return `
#compdef ionic-everywhere create-ionic-everywhere ine

_ionic_everywhere() {
  local -a commands
  commands=(
    'new:Scaffold a new project'
    'add:Add a platform to an existing project'
    'doctor:Check the environment'
    'list:Show generator info for the project'
    'upgrade:Upgrade project tooling'
    'completions:Generate shell completions'
  )

  if (( CURRENT == 2 )); then
    _describe -t commands 'ionic-everywhere command' commands
    return
  fi

  case "\${words[2]}" in
    add)
      local -a platforms
      platforms=('android' 'desktop' 'electron')
      _describe -t platforms 'platform' platforms
      ;;
    completions)
      local -a shells
      shells=('powershell' 'bash' 'zsh' 'fish')
      _describe -t shells 'shell' shells
      ;;
    new)
      _arguments \\
        '--name[Display name of the app]:name:' \\
        '--app-id[Application ID]:id:' \\
        '--pm[Package manager]:pm:(bun npm pnpm yarn)' \\
        '--dir[Project directory]:directory:_files -/' \\
        '--template[Template name]:template:' \\
        '--yes[Accept defaults]' \\
        '--no-android[Skip android]' \\
        '--no-electron[Skip electron]' \\
        '--no-install[Skip install]' \\
        '--no-git[Skip git]' \\
        '--tests[Add tests]' \\
        '--keep-on-failure[Keep on failure]' \\
        '--help[Show help]'
      ;;
    *)
      _arguments \\
        '--help[Show help]' \\
        '--version[Show version]'
      ;;
  }
}

_ionic_everywhere "$@"
`.trim()
}

function fishCompletions(): string {
	return `
function __ionic_everywhere_using_subcommand
    set -l cmd (commandline -opc)
    if [ (count $cmd) -gt 1 ]
        if [ "$cmd[2]" = "$argv[1]" ]
            return 0
        end
    end
    return 1
end

complete -c ionic-everywhere -f
complete -c create-ionic-everywhere -f
complete -c ine -f

complete -c ionic-everywhere -n "not __ionic_everywhere_using_subcommand new; and not __ionic_everywhere_using_subcommand add; and not __ionic_everywhere_using_subcommand doctor; and not __ionic_everywhere_using_subcommand list; and not __ionic_everywhere_using_subcommand upgrade; and not __ionic_everywhere_using_subcommand completions" -a "new add doctor list upgrade completions"

complete -c ionic-everywhere -n "__ionic_everywhere_using_subcommand add" -a "android desktop electron"
complete -c ionic-everywhere -n "__ionic_everywhere_using_subcommand completions" -a "powershell bash zsh fish"
`.trim()
}
