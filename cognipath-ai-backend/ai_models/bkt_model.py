class BKTModel:
    """
    Implements a simple Bayesian Knowledge Tracing (BKT) model.
    This model tracks the probability that a student has "mastered" a skill.
    """
    def __init__(self, p_init=0.2, p_transit=0.1, p_slip=0.1, p_guess=0.2):
        self.p_L = p_init       # P(L_0): Initial probability of knowing the skill
        self.p_T = p_transit    # P(T): Probability of transitioning from not knowing to knowing
        self.p_S = p_slip       # P(S): Probability of making a mistake when knowing the skill
        self.p_G = p_guess      # P(G): Probability of guessing correctly when not knowing

    def get_mastery_probability(self, history: list) -> float:
        """
        Calculates the probability of mastery given a history of answers.
        """
        p_L_prev = self.p_L
        for item in history:
            correct = item.correct
            
            # This check is to prevent division by zero in edge cases
            denominator_correct = (p_L_prev * (1 - self.p_S) + (1 - p_L_prev) * self.p_G)
            denominator_incorrect = (p_L_prev * self.p_S + (1 - p_L_prev) * (1 - self.p_G))

            if correct:
                if denominator_correct == 0: continue
                p_L_cond = (p_L_prev * (1 - self.p_S)) / denominator_correct
            else:
                if denominator_incorrect == 0: continue
                p_L_cond = (p_L_prev * self.p_S) / denominator_incorrect
            
            # Update the probability for the next step
            p_L_current = p_L_cond + (1 - p_L_cond) * self.p_T
            p_L_prev = p_L_current
        
        return p_L_prev

