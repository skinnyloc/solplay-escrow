use anchor_lang::prelude::*;
use anchor_lang::solana_program::system_instruction;

declare_id!("GKvoVVd3eae8kaAe12P2hYQUPBphoE5mUEwP5ueJLqEa");

#[program]
pub mod solplay_escrow {
    use super::*;

    /// Initialize a new game escrow
    pub fn initialize_game(
        ctx: Context<InitializeGame>,
        game_id: String,
        wager_amount: u64,
    ) -> Result<()> {
        let escrow = &mut ctx.accounts.game_escrow;

        escrow.game_id = game_id;
        escrow.player1 = ctx.accounts.player1.key();
        escrow.player2 = Pubkey::default();
        escrow.wager_amount = wager_amount;
        escrow.player1_deposited = false;
        escrow.player2_deposited = false;
        escrow.status = GameStatus::Waiting;
        escrow.house_wallet = Pubkey::try_from("GQ95MH74f2kF6Aqv5dy6PSKq3S1xfwQowwYYqVQPNTMe").unwrap();
        escrow.bump = ctx.bumps.game_escrow;
        escrow.winner = Pubkey::default();

        Ok(())
    }

    /// Player 1 deposits wager
    pub fn deposit_player1(ctx: Context<DepositPlayer1>) -> Result<()> {
        let escrow = &mut ctx.accounts.game_escrow;

        require!(!escrow.player1_deposited, ErrorCode::AlreadyDeposited);

        // Transfer SOL from player1 to escrow PDA
        let transfer_instruction = system_instruction::transfer(
            &ctx.accounts.player1.key(),
            &escrow.key(),
            escrow.wager_amount,
        );

        anchor_lang::solana_program::program::invoke(
            &transfer_instruction,
            &[
                ctx.accounts.player1.to_account_info(),
                escrow.to_account_info(),
                ctx.accounts.system_program.to_account_info(),
            ],
        )?;

        escrow.player1_deposited = true;

        Ok(())
    }

    /// Player 2 joins and deposits
    pub fn deposit_player2(ctx: Context<DepositPlayer2>) -> Result<()> {
        let escrow = &mut ctx.accounts.game_escrow;

        require!(!escrow.player2_deposited, ErrorCode::AlreadyDeposited);
        require!(escrow.player1_deposited, ErrorCode::Player1NotDeposited);

        // Transfer SOL from player2 to escrow PDA
        let transfer_instruction = system_instruction::transfer(
            &ctx.accounts.player2.key(),
            &escrow.key(),
            escrow.wager_amount,
        );

        anchor_lang::solana_program::program::invoke(
            &transfer_instruction,
            &[
                ctx.accounts.player2.to_account_info(),
                escrow.to_account_info(),
                ctx.accounts.system_program.to_account_info(),
            ],
        )?;

        escrow.player2 = ctx.accounts.player2.key();
        escrow.player2_deposited = true;
        escrow.status = GameStatus::Active;

        Ok(())
    }

    /// Resolve game and distribute funds
    pub fn resolve_game(ctx: Context<ResolveGame>, winner: Pubkey) -> Result<()> {
        let escrow = &mut ctx.accounts.game_escrow;

        require!(escrow.status == GameStatus::Active, ErrorCode::GameNotActive);
        require!(
            winner == escrow.player1 || winner == escrow.player2,
            ErrorCode::InvalidWinner
        );

        // Calculate payouts
        let total_pot = escrow.wager_amount.checked_mul(2).unwrap();
        let house_fee = total_pot.checked_mul(3).unwrap().checked_div(100).unwrap(); // 3%
        let winner_payout = total_pot.checked_sub(house_fee).unwrap();

        let game_id = escrow.game_id.clone();
        let bump = escrow.bump;

        // PDA signer seeds
        let seeds = &[
            b"game_escrow",
            game_id.as_bytes(),
            &[bump],
        ];
        let signer = &[&seeds[..]];

        // Transfer to winner
        let winner_transfer = system_instruction::transfer(
            &escrow.key(),
            &winner,
            winner_payout,
        );

        anchor_lang::solana_program::program::invoke_signed(
            &winner_transfer,
            &[
                escrow.to_account_info(),
                if winner == escrow.player1 {
                    ctx.accounts.player1.to_account_info()
                } else {
                    ctx.accounts.player2.to_account_info()
                },
                ctx.accounts.system_program.to_account_info(),
            ],
            signer,
        )?;

        // Transfer house fee
        let house_transfer = system_instruction::transfer(
            &escrow.key(),
            &escrow.house_wallet,
            house_fee,
        );

        anchor_lang::solana_program::program::invoke_signed(
            &house_transfer,
            &[
                escrow.to_account_info(),
                ctx.accounts.house_wallet.to_account_info(),
                ctx.accounts.system_program.to_account_info(),
            ],
            signer,
        )?;

        escrow.status = GameStatus::Completed;
        escrow.winner = winner;

        Ok(())
    }

    /// Cancel game and refund (if opponent doesn't join)
    pub fn cancel_game(ctx: Context<CancelGame>) -> Result<()> {
        let escrow = &mut ctx.accounts.game_escrow;

        require!(escrow.status == GameStatus::Waiting, ErrorCode::CannotCancel);

        if escrow.player1_deposited {
            let game_id = escrow.game_id.clone();
            let bump = escrow.bump;

            let seeds = &[
                b"game_escrow",
                game_id.as_bytes(),
                &[bump],
            ];
            let signer = &[&seeds[..]];

            // Refund player1
            let refund = system_instruction::transfer(
                &escrow.key(),
                &escrow.player1,
                escrow.wager_amount,
            );

            anchor_lang::solana_program::program::invoke_signed(
                &refund,
                &[
                    escrow.to_account_info(),
                    ctx.accounts.player1.to_account_info(),
                    ctx.accounts.system_program.to_account_info(),
                ],
                signer,
            )?;
        }

        escrow.status = GameStatus::Cancelled;

        Ok(())
    }
}

// ACCOUNT CONTEXTS

#[derive(Accounts)]
#[instruction(game_id: String)]
pub struct InitializeGame<'info> {
    #[account(
        init,
        payer = player1,
        space = 8 + GameEscrow::INIT_SPACE,
        seeds = [b"game_escrow", game_id.as_bytes()],
        bump
    )]
    pub game_escrow: Account<'info, GameEscrow>,

    #[account(mut)]
    pub player1: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct DepositPlayer1<'info> {
    #[account(
        mut,
        seeds = [b"game_escrow", game_escrow.game_id.as_bytes()],
        bump = game_escrow.bump
    )]
    pub game_escrow: Account<'info, GameEscrow>,

    #[account(mut)]
    pub player1: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct DepositPlayer2<'info> {
    #[account(
        mut,
        seeds = [b"game_escrow", game_escrow.game_id.as_bytes()],
        bump = game_escrow.bump
    )]
    pub game_escrow: Account<'info, GameEscrow>,

    #[account(mut)]
    pub player2: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ResolveGame<'info> {
    #[account(
        mut,
        seeds = [b"game_escrow", game_escrow.game_id.as_bytes()],
        bump = game_escrow.bump
    )]
    pub game_escrow: Account<'info, GameEscrow>,

    /// CHECK: Can be either player
    #[account(mut)]
    pub player1: AccountInfo<'info>,

    /// CHECK: Can be either player
    #[account(mut)]
    pub player2: AccountInfo<'info>,

    /// CHECK: House wallet address is validated in game_escrow
    #[account(mut)]
    pub house_wallet: AccountInfo<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct CancelGame<'info> {
    #[account(
        mut,
        seeds = [b"game_escrow", game_escrow.game_id.as_bytes()],
        bump = game_escrow.bump
    )]
    pub game_escrow: Account<'info, GameEscrow>,

    #[account(mut)]
    pub player1: Signer<'info>,

    pub system_program: Program<'info, System>,
}

// DATA STRUCTURES

#[account]
#[derive(InitSpace)]
pub struct GameEscrow {
    #[max_len(50)]
    pub game_id: String,
    pub player1: Pubkey,
    pub player2: Pubkey,
    pub wager_amount: u64,
    pub player1_deposited: bool,
    pub player2_deposited: bool,
    pub status: GameStatus,
    pub winner: Pubkey,
    pub house_wallet: Pubkey,
    pub bump: u8,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq, InitSpace)]
pub enum GameStatus {
    Waiting,
    Active,
    Completed,
    Cancelled,
}

// ERRORS

#[error_code]
pub enum ErrorCode {
    #[msg("Player already deposited")]
    AlreadyDeposited,
    #[msg("Player 1 must deposit first")]
    Player1NotDeposited,
    #[msg("Game is not active")]
    GameNotActive,
    #[msg("Cannot cancel active game")]
    CannotCancel,
    #[msg("Invalid winner")]
    InvalidWinner,
}
