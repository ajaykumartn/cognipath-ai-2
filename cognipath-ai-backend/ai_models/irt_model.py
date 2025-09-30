import math

class IRTModel:
    """
    Implements a simple 1-Parameter Logistic (1PL) Item Response Theory model.
    """
    def __init__(self, learning_rate=0.1):
        self.learning_rate = learning_rate

    def _sigmoid(self, x: float) -> float:
        """ The sigmoid function, which maps any value to a value between 0 and 1. """
        # Prevents overflow error for large negative x
        if x < -700:
            return 0
        return 1 / (1 + math.exp(-x))

    def update_ability(self, ability: float, correct: bool, difficulty: int) -> float:
        """
        Updates the user's ability based on their response to a single question.
        """
        # Normalize difficulty to be on a similar scale to ability (0-1)
        normalized_difficulty = difficulty / 4.0 
        
        prob_correct = self._sigmoid(ability - normalized_difficulty)
        
        if correct:
            ability_update = self.learning_rate * (1 - prob_correct)
        else:
            ability_update = -self.learning_rate * prob_correct
            
        new_ability = ability + ability_update
        
        # Clamp the ability score to be between 0.05 and 0.95 to avoid extreme values
        return max(0.05, min(0.95, new_ability))

    def get_next_item_difficulty(self, ability: float) -> int:
        """
        Suggests the optimal difficulty for the next question based on current ability.
        """
        suggested_difficulty = ability * 4.0
        return max(1, min(4, int(round(suggested_difficulty))))

