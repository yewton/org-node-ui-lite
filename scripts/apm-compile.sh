#!/usr/bin/env bash
# Wrapper around `apm compile` that moves paths listed in
# .apm/compile-stash.txt out of the working tree, runs the compile,
# then restores them — even on failure, via a `trap`.
#
# Use this everywhere (locally, by agents, and in CI) instead of calling
# `apm compile` directly so the compile drift check stays stable.
#
# See issue #47 for the rationale and removal criteria.
#
# Usage: scripts/apm-compile.sh [apm-compile-args...]
#   e.g. scripts/apm-compile.sh -t all

set -euo pipefail

REPO_ROOT="$(git rev-parse --show-toplevel)"
STASH_LIST="${REPO_ROOT}/.apm/compile-stash.txt"
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

if [[ -f "${STASH_LIST}" ]]; then
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

apm compile "$@"
