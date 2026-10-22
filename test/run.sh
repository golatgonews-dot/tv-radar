#!/bin/sh
# Builds the site, copies it to test/site, and runs the GitHub storage tests against a fake GitHub API.
set -e
cd "$(dirname "$0")"
sh ../build.sh
rm -rf site && cp -R ../_site site
python3 -u gh_test.py
