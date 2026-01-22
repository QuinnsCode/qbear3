# OpenCode Workflow Setup

This document describes the OpenCode AI coding assistant workflow configuration for this project.

## Configuration

OpenCode is configured to use the **Ollama/DeepSeek-Coder-V2** model for local AI-powered code assistance.

The configuration file is located at `~/.config/opencode/opencode.json` and specifies:
- Model: `ollama/deepseek-coder-v2`
- Schema validation against `https://opencode.ai/config.json`

## Purpose

This setup enables local, privacy-focused AI coding assistance using the DeepSeek Coder V2 model running through Ollama, providing intelligent code completions, suggestions, and assistance without sending code to external services.

## Testing Branch

This branch (`test-opencode-workflow`) was created to verify and test the OpenCode workflow integration.
