#![no_std]
use soroban_sdk::{contract, contractimpl, Env, Symbol, Address, Map};

#[contract]
pub struct BettingContract;

#[contractimpl]
impl BettingContract {

    // Place a bet
    pub fn place_bet(env: Env, user: Address, match_id: u32, team: Symbol, amount: i128) {
        let key = (user.clone(), match_id);
        let mut bets: Map<(Address, u32), (Symbol, i128)> = env.storage().instance().get(&key).unwrap_or(Map::new(&env));

        bets.set(key.clone(), (team, amount));
        env.storage().instance().set(&key, &bets);
    }

    // Get bet details
    pub fn get_bet(env: Env, user: Address, match_id: u32) -> Option<(Symbol, i128)> {
        let key = (user, match_id);
        env.storage().instance().get(&key)
    }

    // Declare winner (admin function)
    pub fn declare_winner(env: Env, match_id: u32, winning_team: Symbol) {
        env.storage().instance().set(&match_id, &winning_team);
    }

    // Claim reward
    pub fn claim_reward(env: Env, user: Address, match_id: u32) -> bool {
        let key = (user.clone(), match_id);

        if let Some((team, amount)) = env.storage().instance().get::<_, (Symbol, i128)>(&key) {
            let winner: Symbol = env.storage().instance().get(&match_id).unwrap();

            if team == winner {
                // In real app: transfer tokens
                return true;
            }
        }
        false
    }
}