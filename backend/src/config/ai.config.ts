/**
 * AI Configuration for MantlePulse Chatbox
 * OpenAI API integration settings and system prompts
 */

// AI Model Configuration
export const AI_CONFIG = {
  model: process.env.AI_MODEL || 'gpt-4o',
  maxTokens: 2048,
  temperature: 0.7,
} as const;

// System prompt for the AI assistant
export const SYSTEM_PROMPT = `You are the MantlePulse AI Assistant, helping users create and manage polls on the Mantle blockchain.

## CRITICAL: Always Use Tools
You MUST use the provided function tools to perform actions. Do NOT just describe what you would do - actually call the tools.

When a user wants to create a poll:
1. IMMEDIATELY call the \`preview_poll\` function with the poll details
2. Do NOT just list the options in text - use the tool to generate a visual preview
3. The preview_poll tool will display a nice UI card for the user

## Your Capabilities:
1. **Create Polls** - Use \`preview_poll\` to show a preview, then user confirms to create
2. **Fund Polls with SideShift** - When user specifies funding, include fundingToken and fundingAmount in \`preview_poll\`
3. **Manage Polls** - Use \`get_user_polls\` and \`get_poll_details\` to show poll info
4. **Claim Rewards** - Use \`create_claim_shift\` to claim rewards in any cryptocurrency
5. **Collect Feedback** - Use \`collect_feedback\` when user wants to share feedback about the platform

## Poll Creation Flow:
1. User requests a poll → Call \`preview_poll\` with question, options, duration
2. If user doesn't specify options, suggest 4-6 relevant ones and call \`preview_poll\`
3. Duration defaults to 7 days (604800 seconds) if not specified
4. maxVoters defaults to 0 (unlimited) if not specified

## Funding Flow:
There are TWO ways to fund a poll:

### 1. Direct Funding (Default)
When user mentions funding without SideShift keywords:
- Example: "fund with 0.01 ETH", "add $50 reward", "fund of 0.001 ETH"
- Set \`fundingToken\` and \`fundingAmount\` in \`preview_poll\`
- Set \`useSideshift: false\` (or omit it)
- The UI will show "Create Poll" button → user signs one transaction to create and fund

### 2. SideShift Funding (Cross-chain)
When user explicitly mentions SideShift OR wants to convert from another chain:
- Keywords: "sideshift", "convert", "from BTC", "from Solana", "cross-chain", "bridge"
- Example: "fund with BTC using sideshift", "convert 0.1 SOL to fund"
- Set \`fundingToken\`, \`fundingAmount\`, AND \`useSideshift: true\`
- The UI will show "Create Shift" button → creates shift first, then poll

### IMPORTANT: SideShift Minimum Amounts
When using SideShift (cross-chain funding), there are MINIMUM deposit amounts that vary by currency:
- ETH: Minimum ~0.002 ETH (approximately $5-10 USD worth)
- BTC: Minimum ~0.0002 BTC
- SOL: Minimum ~0.1 SOL
- USDC/USDT: Minimum ~$5-10
These minimums are set by SideShift and change based on network fees. If the user specifies an amount that seems too low (e.g., 0.0001 ETH), warn them that there's a minimum deposit requirement and suggest using a higher amount. The system will validate the exact minimum when the shift is created.

### Funding Token Mapping:
- If user says "PULSE" → fundingToken: "PULSE" (native token on Mantle)
- If user says "$50", "50 USD", "50 USDC" → fundingToken: "USDC"
- For SideShift: any crypto (BTC, SOL, etc.) converts to USDC/PULSE on Mantle

## Feedback Collection:
When a user wants to share feedback, suggestions, or report issues:
1. Acknowledge their feedback and determine the category:
   - "feature_request" - Suggestions for new features or improvements
   - "bug_report" - Issues or problems with the platform
   - "ui_ux" - Feedback about design and user experience
   - "general" - Any other feedback
2. Call \`collect_feedback\` with the category and content
3. Ask if they want to share their wallet address for potential rewards
4. Thank them for their feedback

## Important Rules:
- ALWAYS call \`preview_poll\` when user wants to create a poll - never just describe it in text
- Extract poll parameters from user's message and pass them to the tool
- If user mentions funding/rewards, ALWAYS include fundingToken and fundingAmount
- ALWAYS call \`collect_feedback\` when user wants to share feedback - don't just acknowledge it
- Be concise in your text responses
- The UI will render tool results nicely - trust the tools

Remember: You're helping democratize decision-making through blockchain-powered polls!`;

// Tool definitions for OpenAI function calling
export const AI_TOOLS = [
  {
    type: 'function' as const,
    function: {
      name: 'preview_poll',
      description: 'REQUIRED: Call this function whenever a user wants to create a poll. This displays a visual preview card with the poll details. If user mentions funding (e.g., "fund with ETH", "$50 reward"), include fundingToken and fundingAmount. Always use this instead of describing the poll in text.',
      parameters: {
        type: 'object',
        properties: {
          question: {
            type: 'string',
            description: 'The poll question to ask voters',
          },
          options: {
            type: 'array',
            items: { type: 'string' },
            description: 'Array of 2-10 voting options. Generate sensible options if user did not specify.',
          },
          duration: {
            type: 'number',
            description: 'Poll duration in seconds. Default to 604800 (7 days) if not specified.',
          },
          maxVoters: {
            type: 'number',
            description: 'Maximum number of voters. Use 0 or omit for unlimited.',
          },
          fundingAmount: {
            type: 'string',
            description: 'Amount of funding in the token (e.g., "0.01" for 0.01 ETH, "50" for 50 USDC). Include this if user mentions any funding or rewards.',
          },
          fundingToken: {
            type: 'string',
            description: 'Token for funding (e.g., "PULSE", "USDC"). For direct funding on Mantle, use PULSE or USDC. For SideShift, can be any crypto.',
          },
          useSideshift: {
            type: 'boolean',
            description: 'Set to true ONLY if user explicitly mentions "sideshift", "convert", "bridge", or wants to fund from another chain (e.g., "from BTC", "from Solana"). Default is false for direct funding.',
          },
        },
        required: ['question', 'options'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'create_poll',
      description: 'Create a new poll on the blockchain. Only call this after the user confirms the preview.',
      parameters: {
        type: 'object',
        properties: {
          question: {
            type: 'string',
            description: 'The poll question',
          },
          options: {
            type: 'array',
            items: { type: 'string' },
            description: 'Array of poll options',
          },
          duration: {
            type: 'number',
            description: 'Poll duration in seconds',
          },
          maxVoters: {
            type: 'number',
            description: 'Maximum number of voters (0 for unlimited)',
          },
        },
        required: ['question', 'options', 'duration'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'create_funding_shift',
      description: 'Create a SideShift order to fund a poll with any cryptocurrency',
      parameters: {
        type: 'object',
        properties: {
          pollId: {
            type: 'string',
            description: 'The poll ID to fund',
          },
          sourceCoin: {
            type: 'string',
            description: 'Source cryptocurrency (e.g., "BTC", "ETH", "SOL")',
          },
          sourceNetwork: {
            type: 'string',
            description: 'Source network (e.g., "bitcoin", "ethereum", "solana")',
          },
          amount: {
            type: 'string',
            description: 'Amount to send in source currency',
          },
        },
        required: ['pollId', 'sourceCoin', 'amount'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'get_user_polls',
      description: 'Get all polls created by the current user',
      parameters: {
        type: 'object',
        properties: {
          userAddress: {
            type: 'string',
            description: 'User wallet address',
          },
          status: {
            type: 'string',
            enum: ['active', 'ended', 'all'],
            description: 'Filter by poll status',
          },
        },
        required: ['userAddress'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'get_poll_details',
      description: 'Get details of a specific poll',
      parameters: {
        type: 'object',
        properties: {
          pollId: {
            type: 'string',
            description: 'The poll ID',
          },
        },
        required: ['pollId'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'get_claimable_rewards',
      description: 'Get claimable rewards for a user',
      parameters: {
        type: 'object',
        properties: {
          userAddress: {
            type: 'string',
            description: 'User wallet address',
          },
        },
        required: ['userAddress'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'create_claim_shift',
      description: 'Create a SideShift order to claim rewards in any cryptocurrency',
      parameters: {
        type: 'object',
        properties: {
          pollId: {
            type: 'string',
            description: 'The poll ID to claim rewards from',
          },
          destCoin: {
            type: 'string',
            description: 'Destination cryptocurrency (e.g., "BTC", "USDC", "SOL")',
          },
          destNetwork: {
            type: 'string',
            description: 'Destination network (e.g., "bitcoin", "ethereum", "solana")',
          },
        },
        required: ['pollId', 'destCoin'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'get_shift_status',
      description: 'Check the status of a SideShift order',
      parameters: {
        type: 'object',
        properties: {
          shiftId: {
            type: 'string',
            description: 'The SideShift order ID',
          },
        },
        required: ['shiftId'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'get_pair_info',
      description: 'Get exchange pair information including minimum and maximum deposit amounts. ALWAYS call this before suggesting a SideShift funding amount to ensure the amount is within valid limits.',
      parameters: {
        type: 'object',
        properties: {
          depositCoin: {
            type: 'string',
            description: 'The cryptocurrency to deposit (e.g., "ETH", "BTC", "SOL")',
          },
          settleCoin: {
            type: 'string',
            description: 'The cryptocurrency to receive (e.g., "ETH", "USDC")',
          },
          depositNetwork: {
            type: 'string',
            description: 'Optional: specific network for deposit coin (e.g., "ethereum", "base", "solana")',
          },
          settleNetwork: {
            type: 'string',
            description: 'Optional: specific network for settle coin. Defaults to "mantle" for poll funding.',
          },
        },
        required: ['depositCoin', 'settleCoin'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'collect_feedback',
      description: 'Collect user feedback about the MantlePulse platform. Call this whenever a user wants to share feedback, suggestions, report bugs, or provide any comments about the platform.',
      parameters: {
        type: 'object',
        properties: {
          category: {
            type: 'string',
            enum: ['feature_request', 'bug_report', 'ui_ux', 'general'],
            description: 'The feedback category: feature_request (new features/improvements), bug_report (issues/problems), ui_ux (design/UX feedback), or general (other feedback)',
          },
          content: {
            type: 'string',
            description: 'The feedback content provided by the user',
          },
          shareWallet: {
            type: 'boolean',
            description: 'Whether the user wants to share their wallet address for potential rewards. Default is false (anonymous).',
          },
        },
        required: ['category', 'content'],
      },
    },
  },
];
