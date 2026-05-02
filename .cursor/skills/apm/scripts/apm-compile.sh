#!/usr/bin/env bash
# Wrapper around `apm compile` that optionally stashes paths from a
# project-supplied list before running, restoring them on exit (even
# on failure, via a `trap`).
#
# With --stash-list PATH:
#   PATH points to a file containing one entry per line. Each entry is
#   a path relative to the repository root; `#` introduces a comment;
#   blank lines are ignored. Listed files / directories are moved out
#   of the working tree before `apm compile` runs and restored after.
#   Entries that don't resolve to anything on disk produce a warning
#   (so a contributor who forgot to run `apm install`, or whose stash
#   list has gone stale, gets a useful hint) but are otherwise skipped.
#
# Without --stash-list:
#   The script is a thin pass-through to `apm compile`.
#
# Remaining args are forwarded to `apm compile`. Use `--` to mark the
# end of wrapper options if any compile arg might collide with one.
#
# This wrapper exists because APM's claude_formatter unconditionally
# emits `@apm_modules/<owner>/<package>/CLAUDE.md` imports for every
# populated dependency, regardless of `compilation.exclude`. The skill
# this script ships with documents the bug and removal criteria — see
# the SKILL.md alongside it.

set -euo pipefail

usage() {
	cat >&2 <<-EOF
		Usage: $(basename "$0") [--stash-list PATH] [-- apm-compile-args...]
		       $(basename "$0") --help
	EOF
}

STASH_LIST=""
declare -a COMPILE_ARGS=()

while (( $# > 0 )); do
	case "$1" in
		--stash-list)
			if [[ $# -lt 2 ]]; then
				usage
				exit 1
			fi
			STASH_LIST="$2"
			shift 2
			;;
		--stash-list=*)
			STASH_LIST="${1#--stash-list=}"
			shift
			;;
		-h|--help)
			usage
			exit 0
			;;
		--)
			shift
			COMPILE_ARGS+=("$@")
			break
			;;
		*)
			COMPILE_ARGS+=("$1")
			shift
			;;
	esac
done

REPO_ROOT="$(git rev-parse --show-toplevel)"
STASH_DIR="$(mktemp -d)"
declare -a STASHED=()

restore() {
	local path
	if (( ${#STASHED[@]} > 0 )); then
		for path in "${STASHED[@]}"; do
			if [[ -e "${STASH_DIR}/${path}" ]]; then
				mkdir -p "${REPO_ROOT}/$(dirname "${path}")"
				mv "${STASH_DIR}/${path}" "${REPO_ROOT}/${path}"
			fi
		done
	fi
	rm -rf "${STASH_DIR}"
}
trap restore EXIT

if [[ -n "${STASH_LIST}" ]]; then
	if [[ ! -f "${STASH_LIST}" ]]; then
		echo "error: stash list '${STASH_LIST}' not found" >&2
		exit 1
	fi
	while IFS= read -r line || [[ -n "${line}" ]]; do
		# Strip comments and surrounding whitespace.
		line="${line%%#*}"
		line="${line#"${line%%[![:space:]]*}"}"
		line="${line%"${line##*[![:space:]]}"}"
		[[ -z "${line}" ]] && continue
		if [[ -e "${REPO_ROOT}/${line}" ]]; then
			mkdir -p "${STASH_DIR}/$(dirname "${line}")"
			mv "${REPO_ROOT}/${line}" "${STASH_DIR}/${line}"
			STASHED+=("${line}")
		else
			echo "warning: stash entry '${line}' did not match any path in the working tree (skipped). Run 'apm install' first if the dependency just isn't installed yet; otherwise remove the entry from ${STASH_LIST}." >&2
		fi
	done < "${STASH_LIST}"
fi

apm compile "${COMPILE_ARGS[@]}"
