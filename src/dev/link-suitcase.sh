#!/usr/bin/env bash

set -o nounset      # Treat unset variables as an error when substituting
set -o errexit      # Exit immediately if any command returns a non-zero status
set -o pipefail     # Prevent errors in a pipeline from being masked
set -o xtrace       # Print each command to the terminal before execution

PATH_SUITCASE=$HOME/data/code/polymedia-suitcase
PATH_BIDDER=$HOME/data/code/polymedia-bidder

cd $PATH_SUITCASE
pnpm build

cd $PATH_BIDDER/src/sdk
pnpm link $PATH_SUITCASE/src/core

cd $PATH_BIDDER/src/web
pnpm link $PATH_SUITCASE/src/core
pnpm link $PATH_SUITCASE/src/react
