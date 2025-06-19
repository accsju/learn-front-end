// Example simulation. Don't copy inputto the project!
const stateA = [1, 0, 0, 0, 0, 0, 0, 0];
const stateB = [0, 0, 0, 0, 0, 0, 0, 0];

function simulate(input, output) {
  output[0] = 0;
  for (let i = 1; i < input.length; ++i) {
     output[i] = input[i-1];
  }
}

// Run the simulation for two step.
simulate(stateA, stateB);
console.log(stateA, stateB);
simulate(stateB, stateA); 
console.log(stateA, stateB);