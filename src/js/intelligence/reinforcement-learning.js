/*******************************************************************************

    OblivionFilter - Reinforcement Learning Engine v2.0.0
    Copyright (C) 2025 OblivionFilter Contributors

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with this program.  If not, see <http://www.gnu.org/licenses/>.

    Home: https://github.com/734ai/OblivionFilter

*******************************************************************************/

'use strict';

/******************************************************************************/

// Reinforcement Learning Engine for Adaptive Content Filtering
// Learns optimal filtering strategies through interaction and feedback
const ReinforcementLearningEngine = (function() {

    /******************************************************************************/

    // Configuration
    const config = {
        enabled: true,
        
        // RL algorithm settings
        algorithm: {
            type: 'dqn', // dqn, policy_gradient, actor_critic, q_learning
            learningRate: 0.001,
            discountFactor: 0.95,
            explorationRate: 1.0,
            explorationDecay: 0.995,
            minExplorationRate: 0.01,
            memorySize: 10000,
            batchSize: 32,
            targetUpdateFreq: 100
        },
        
        // Environment settings
        environment: {
            stateSize: 64, // Feature vector size
            actionSize: 8, // Number of possible actions
            rewardShaping: true,
            maxEpisodeLength: 1000,
            episodeTimeout: 300000 // 5 minutes
        },
        
        // Training settings
        training: {
            enabled: true,
            episodesPerUpdate: 10,
            saveFrequency: 100,
            evaluationFrequency: 50,
            convergenceThreshold: 0.001,
            maxEpisodes: 10000
        },
        
        // Network architecture
        network: {
            hiddenLayers: [256, 128, 64],
            activationFunction: 'relu',
            outputActivation: 'linear',
            dropout: 0.2,
            batchNormalization: true
        }
    };

    /******************************************************************************/

    // State management
    const state = {
        initialized: false,
        currentEpisode: 0,
        totalSteps: 0,
        agent: null,
        environment: null,
        replayMemory: [],
        episodeHistory: [],
        lastState: null,
        lastAction: null,
        cumulativeReward: 0,
        learningStats: {
            totalEpisodes: 0,
            averageReward: 0,
            explorationRate: config.algorithm.explorationRate,
            loss: 0,
            accuracy: 0,
            convergenceScore: 0
        }
    };

    /******************************************************************************/

    // Deep Q-Network Implementation
    const DQN = {
        
        // Initialize DQN
        initialize(stateSize, actionSize, hiddenLayers) {
            console.log('[RL] Initializing Deep Q-Network...');
            
            const network = {
                layers: [],
                targetNetwork: null,
                optimizer: {
                    type: 'adam',
                    learningRate: config.algorithm.learningRate,
                    beta1: 0.9,
                    beta2: 0.999,
                    epsilon: 1e-8,
                    momentum: {}
                }
            };
            
            // Build network architecture
            let inputSize = stateSize;
            
            hiddenLayers.forEach((size, index) => {
                const layer = {
                    size: size,
                    weights: this.initializeWeights(inputSize, size),
                    biases: this.initializeBiases(size),
                    activation: config.network.activationFunction,
                    dropout: config.network.dropout,
                    batchNorm: config.network.batchNormalization
                };
                
                network.layers.push(layer);
                inputSize = size;
            });
            
            // Output layer
            const outputLayer = {
                size: actionSize,
                weights: this.initializeWeights(inputSize, actionSize),
                biases: this.initializeBiases(actionSize),
                activation: config.network.outputActivation,
                dropout: 0,
                batchNorm: false
            };
            
            network.layers.push(outputLayer);
            
            // Create target network (copy of main network)
            network.targetNetwork = JSON.parse(JSON.stringify(network.layers));
            
            return network;
        },
        
        // Xavier weight initialization
        initializeWeights(inputSize, outputSize) {
            const weights = [];
            const scale = Math.sqrt(2.0 / (inputSize + outputSize));
            
            for (let i = 0; i < inputSize; i++) {
                weights[i] = [];
                for (let j = 0; j < outputSize; j++) {
                    weights[i][j] = (Math.random() - 0.5) * 2 * scale;
                }
            }
            
            return weights;
        },
        
        // Initialize biases
        initializeBiases(size) {
            return new Array(size).fill(0);
        },
        
        // Forward pass through network
        forward(network, input, useTargetNetwork = false) {
            const layers = useTargetNetwork ? network.targetNetwork : network.layers;
            let activation = input;
            const activations = [activation];
            
            layers.forEach((layer, index) => {
                activation = this.layerForward(activation, layer, index === layers.length - 1);
                activations.push(activation);
            });
            
            return {
                qValues: activation,
                activations: activations
            };
        },
        
        // Layer forward pass
        layerForward(input, layer, isOutput = false) {
            const output = new Array(layer.size).fill(0);
            
            // Matrix multiplication + bias
            for (let j = 0; j < layer.size; j++) {
                for (let i = 0; i < input.length; i++) {
                    output[j] += input[i] * layer.weights[i][j];
                }
                output[j] += layer.biases[j];
            }
            
            // Batch normalization (simplified)
            if (layer.batchNorm && !isOutput) {
                const mean = output.reduce((sum, val) => sum + val, 0) / output.length;
                const variance = output.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / output.length;
                const std = Math.sqrt(variance + 1e-8);
                
                for (let i = 0; i < output.length; i++) {
                    output[i] = (output[i] - mean) / std;
                }
            }
            
            // Apply activation function
            output.forEach((value, index) => {
                output[index] = this.applyActivation(value, layer.activation);
            });
            
            // Apply dropout during training (simplified)
            if (layer.dropout > 0 && !isOutput) {
                output.forEach((value, index) => {
                    if (Math.random() < layer.dropout) {
                        output[index] = 0;
                    } else {
                        output[index] = value / (1 - layer.dropout);
                    }
                });
            }
            
            return output;
        },
        
        // Apply activation function
        applyActivation(x, activationType) {
            switch (activationType) {
                case 'relu':
                    return Math.max(0, x);
                case 'leaky_relu':
                    return x > 0 ? x : 0.01 * x;
                case 'sigmoid':
                    return 1 / (1 + Math.exp(-x));
                case 'tanh':
                    return Math.tanh(x);
                case 'linear':
                    return x;
                default:
                    return x;
            }
        },
        
        // Backward pass and weight update
        backward(network, input, target, prediction) {
            const layers = network.layers;
            const activations = prediction.activations;
            const gradients = [];
            
            // Calculate output error
            let delta = prediction.qValues.map((pred, i) => pred - target[i]);
            
            // Backpropagate through layers
            for (let layerIdx = layers.length - 1; layerIdx >= 0; layerIdx--) {
                const layer = layers[layerIdx];
                const layerInput = layerIdx === 0 ? input : activations[layerIdx];
                
                const layerGradients = this.calculateLayerGradients(layer, layerInput, delta);
                gradients.unshift(layerGradients);
                
                // Calculate delta for previous layer
                if (layerIdx > 0) {
                    delta = this.calculatePreviousDelta(layer, delta, activations[layerIdx]);
                }
            }
            
            // Update weights using optimizer
            this.updateWeights(network, gradients);
            
            return gradients;
        },
        
        // Calculate layer gradients
        calculateLayerGradients(layer, input, delta) {
            const weightGradients = [];
            const biasGradients = [];
            
            // Weight gradients
            for (let i = 0; i < input.length; i++) {
                weightGradients[i] = [];
                for (let j = 0; j < layer.size; j++) {
                    weightGradients[i][j] = input[i] * delta[j];
                }
            }
            
            // Bias gradients
            for (let j = 0; j < layer.size; j++) {
                biasGradients[j] = delta[j];
            }
            
            return {
                weights: weightGradients,
                biases: biasGradients
            };
        },
        
        // Calculate delta for previous layer
        calculatePreviousDelta(layer, delta, activations) {
            const previousDelta = new Array(layer.weights.length).fill(0);
            
            for (let i = 0; i < previousDelta.length; i++) {
                for (let j = 0; j < delta.length; j++) {
                    previousDelta[i] += delta[j] * layer.weights[i][j];
                }
                
                // Apply derivative of activation function
                const activation = activations[i];
                previousDelta[i] *= this.activationDerivative(activation, layer.activation);
            }
            
            return previousDelta;
        },
        
        // Activation function derivative
        activationDerivative(x, activationType) {
            switch (activationType) {
                case 'relu':
                    return x > 0 ? 1 : 0;
                case 'leaky_relu':
                    return x > 0 ? 1 : 0.01;
                case 'sigmoid':
                    return x * (1 - x);
                case 'tanh':
                    return 1 - x * x;
                case 'linear':
                    return 1;
                default:
                    return 1;
            }
        },
        
        // Update weights using Adam optimizer
        updateWeights(network, gradients) {
            const optimizer = network.optimizer;
            
            network.layers.forEach((layer, layerIdx) => {
                const layerGradients = gradients[layerIdx];
                
                // Initialize momentum if not exists
                if (!optimizer.momentum[layerIdx]) {
                    optimizer.momentum[layerIdx] = {
                        weights: layer.weights.map(row => row.map(() => 0)),
                        biases: layer.biases.map(() => 0),
                        weightsV: layer.weights.map(row => row.map(() => 0)),
                        biasesV: layer.biases.map(() => 0)
                    };
                }
                
                const momentum = optimizer.momentum[layerIdx];
                
                // Update weights
                for (let i = 0; i < layer.weights.length; i++) {
                    for (let j = 0; j < layer.weights[i].length; j++) {
                        const gradient = layerGradients.weights[i][j];
                        
                        // Adam momentum update
                        momentum.weights[i][j] = optimizer.beta1 * momentum.weights[i][j] + 
                                               (1 - optimizer.beta1) * gradient;
                        momentum.weightsV[i][j] = optimizer.beta2 * momentum.weightsV[i][j] + 
                                                (1 - optimizer.beta2) * gradient * gradient;
                        
                        // Bias correction
                        const mHat = momentum.weights[i][j] / (1 - Math.pow(optimizer.beta1, state.totalSteps + 1));
                        const vHat = momentum.weightsV[i][j] / (1 - Math.pow(optimizer.beta2, state.totalSteps + 1));
                        
                        // Weight update
                        layer.weights[i][j] -= optimizer.learningRate * mHat / (Math.sqrt(vHat) + optimizer.epsilon);
                    }
                }
                
                // Update biases
                for (let j = 0; j < layer.biases.length; j++) {
                    const gradient = layerGradients.biases[j];
                    
                    // Adam momentum update
                    momentum.biases[j] = optimizer.beta1 * momentum.biases[j] + 
                                       (1 - optimizer.beta1) * gradient;
                    momentum.biasesV[j] = optimizer.beta2 * momentum.biasesV[j] + 
                                        (1 - optimizer.beta2) * gradient * gradient;
                    
                    // Bias correction
                    const mHat = momentum.biases[j] / (1 - Math.pow(optimizer.beta1, state.totalSteps + 1));
                    const vHat = momentum.biasesV[j] / (1 - Math.pow(optimizer.beta2, state.totalSteps + 1));
                    
                    // Bias update
                    layer.biases[j] -= optimizer.learningRate * mHat / (Math.sqrt(vHat) + optimizer.epsilon);
                }
            });
        },
        
        // Update target network
        updateTargetNetwork(network) {
            console.log('[RL] Updating target network...');
            network.targetNetwork = JSON.parse(JSON.stringify(network.layers));
        }
    };

    /******************************************************************************/

    // RL Environment for Content Filtering
    const FilteringEnvironment = {
        
        // Initialize environment
        initialize() {
            console.log('[RL] Initializing filtering environment...');
            
            return {
                currentState: this.resetState(),
                episodeStep: 0,
                episodeReward: 0,
                done: false,
                contentQueue: [],
                filteredContent: [],
                userFeedback: []
            };
        },
        
        // Reset environment state
        resetState() {
            return {
                contentFeatures: new Array(config.environment.stateSize).fill(0),
                filteringHistory: [],
                userSatisfaction: 0.5,
                false_positives: 0,
                false_negatives: 0,
                timestamp: Date.now()
            };
        },
        
        // Generate random content for training
        generateContent() {
            return {
                id: 'content_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
                type: Math.random() > 0.5 ? 'ad' : 'content',
                features: new Array(config.environment.stateSize).fill(0).map(() => Math.random()),
                priority: Math.random(),
                timestamp: Date.now()
            };
        },
        
        // Extract state from current environment
        extractState(environment) {
            const features = environment.currentState.contentFeatures;
            const history = environment.currentState.filteringHistory.slice(-10); // Last 10 actions
            const satisfaction = environment.currentState.userSatisfaction;
            
            // Combine features into state vector
            const state = [...features];
            
            // Add historical context
            history.forEach(action => {
                state.push(action.type || 0);
                state.push(action.confidence || 0);
            });
            
            // Pad or truncate to exact state size
            while (state.length < config.environment.stateSize) {
                state.push(0);
            }
            
            return state.slice(0, config.environment.stateSize);
        },
        
        // Execute action in environment
        step(environment, action, content) {
            const actionTypes = [
                'block_aggressive',    // 0
                'block_moderate',      // 1
                'block_conservative',  // 2
                'allow_conservative',  // 3
                'allow_moderate',      // 4
                'allow_aggressive',    // 5
                'request_feedback',    // 6
                'adaptive_learning'    // 7
            ];
            
            const actionType = actionTypes[action] || 'allow_moderate';
            const reward = this.calculateReward(environment, action, content);
            
            // Update environment state
            environment.currentState.filteringHistory.push({
                action: action,
                type: actionType,
                content: content.id,
                reward: reward,
                timestamp: Date.now()
            });
            
            environment.episodeStep++;
            environment.episodeReward += reward;
            
            // Check if episode is done
            const done = environment.episodeStep >= config.environment.maxEpisodeLength ||
                        environment.episodeReward < -100 ||
                        environment.currentState.userSatisfaction < 0.1;
            
            environment.done = done;
            
            // Generate next content
            const nextContent = this.generateContent();
            environment.currentState.contentFeatures = nextContent.features;
            
            return {
                nextState: this.extractState(environment),
                reward: reward,
                done: done,
                info: {
                    action: actionType,
                    content: content,
                    satisfaction: environment.currentState.userSatisfaction
                }
            };
        },
        
        // Calculate reward for action
        calculateReward(environment, action, content) {
            let reward = 0;
            const isAd = content.type === 'ad';
            const isBlocking = action < 3; // Actions 0-2 are blocking
            
            // Base reward for correct classification
            if (isAd && isBlocking) {
                reward += 10; // Correctly blocked ad
            } else if (!isAd && !isBlocking) {
                reward += 5; // Correctly allowed content
            } else if (isAd && !isBlocking) {
                reward -= 15; // False negative (missed ad)
                environment.currentState.false_negatives++;
            } else if (!isAd && isBlocking) {
                reward -= 20; // False positive (blocked good content)
                environment.currentState.false_positives++;
            }
            
            // Reward shaping based on confidence
            const confidence = Math.abs(action - 3.5) / 3.5; // Distance from neutral action
            if ((isAd && isBlocking) || (!isAd && !isBlocking)) {
                reward += confidence * 5; // Bonus for confident correct decisions
            }
            
            // User satisfaction impact
            const satisfactionDelta = this.calculateSatisfactionChange(environment, action, content);
            environment.currentState.userSatisfaction = Math.max(0, Math.min(1, 
                environment.currentState.userSatisfaction + satisfactionDelta));
            reward += satisfactionDelta * 50;
            
            // Penalty for poor balance
            const errorRatio = environment.currentState.false_positives / 
                             Math.max(1, environment.currentState.false_negatives);
            if (errorRatio > 2 || errorRatio < 0.5) {
                reward -= 5; // Penalty for imbalanced errors
            }
            
            return reward;
        },
        
        // Calculate user satisfaction change
        calculateSatisfactionChange(environment, action, content) {
            const isAd = content.type === 'ad';
            const isBlocking = action < 3;
            
            if (isAd && isBlocking) {
                return 0.02; // Slight increase for blocking ads
            } else if (!isAd && !isBlocking) {
                return 0.01; // Slight increase for allowing content
            } else if (isAd && !isBlocking) {
                return -0.05; // Decrease for missing ads
            } else if (!isAd && isBlocking) {
                return -0.08; // Larger decrease for blocking good content
            }
            
            return 0;
        }
    };

    /******************************************************************************/

    // Replay Memory for Experience Replay
    const ReplayMemory = {
        
        // Add experience to memory
        add(state, action, reward, nextState, done) {
            const experience = {
                state: state,
                action: action,
                reward: reward,
                nextState: nextState,
                done: done,
                timestamp: Date.now()
            };
            
            state.replayMemory.push(experience);
            
            // Remove old experiences if memory is full
            if (state.replayMemory.length > config.algorithm.memorySize) {
                state.replayMemory.shift();
            }
        },
        
        // Sample batch from memory
        sample(batchSize) {
            if (state.replayMemory.length < batchSize) {
                return state.replayMemory.slice();
            }
            
            const batch = [];
            const indices = new Set();
            
            while (batch.length < batchSize) {
                const index = Math.floor(Math.random() * state.replayMemory.length);
                if (!indices.has(index)) {
                    indices.add(index);
                    batch.push(state.replayMemory[index]);
                }
            }
            
            return batch;
        },
        
        // Get memory size
        size() {
            return state.replayMemory.length;
        },
        
        // Clear memory
        clear() {
            state.replayMemory = [];
        }
    };

    /******************************************************************************/

    // RL Agent Implementation
    const RLAgent = {
        
        // Initialize agent
        initialize() {
            console.log('[RL] Initializing RL agent...');
            
            const agent = {
                network: DQN.initialize(
                    config.environment.stateSize,
                    config.environment.actionSize,
                    config.network.hiddenLayers
                ),
                explorationRate: config.algorithm.explorationRate,
                totalSteps: 0
            };
            
            return agent;
        },
        
        // Select action using epsilon-greedy policy
        selectAction(agent, state) {
            // Exploration vs exploitation
            if (Math.random() < agent.explorationRate) {
                // Random exploration
                return Math.floor(Math.random() * config.environment.actionSize);
            } else {
                // Greedy exploitation
                const prediction = DQN.forward(agent.network, state);
                return this.argmax(prediction.qValues);
            }
        },
        
        // Find index of maximum value
        argmax(array) {
            let maxIndex = 0;
            let maxValue = array[0];
            
            for (let i = 1; i < array.length; i++) {
                if (array[i] > maxValue) {
                    maxValue = array[i];
                    maxIndex = i;
                }
            }
            
            return maxIndex;
        },
        
        // Train agent on batch of experiences
        train(agent, batch) {
            if (batch.length === 0) return;
            
            let totalLoss = 0;
            
            batch.forEach(experience => {
                const { state, action, reward, nextState, done } = experience;
                
                // Current Q-values
                const currentPrediction = DQN.forward(agent.network, state);
                const target = [...currentPrediction.qValues];
                
                if (done) {
                    // Terminal state
                    target[action] = reward;
                } else {
                    // Use target network for stability
                    const nextPrediction = DQN.forward(agent.network, nextState, true);
                    const maxNextQ = Math.max(...nextPrediction.qValues);
                    target[action] = reward + config.algorithm.discountFactor * maxNextQ;
                }
                
                // Backward pass and weight update
                DQN.backward(agent.network, state, target, currentPrediction);
                
                // Calculate loss (MSE)
                const loss = target.reduce((sum, t, i) => {
                    const error = t - currentPrediction.qValues[i];
                    return sum + error * error;
                }, 0) / target.length;
                
                totalLoss += loss;
            });
            
            // Update exploration rate
            agent.explorationRate = Math.max(
                config.algorithm.minExplorationRate,
                agent.explorationRate * config.algorithm.explorationDecay
            );
            
            state.learningStats.explorationRate = agent.explorationRate;
            state.learningStats.loss = totalLoss / batch.length;
            
            // Update target network periodically
            if (agent.totalSteps % config.algorithm.targetUpdateFreq === 0) {
                DQN.updateTargetNetwork(agent.network);
            }
            
            agent.totalSteps++;
        },
        
        // Evaluate agent performance
        evaluate(agent, environment, episodes = 10) {
            console.log('[RL] Evaluating agent performance...');
            
            let totalReward = 0;
            let correctActions = 0;
            let totalActions = 0;
            
            for (let episode = 0; episode < episodes; episode++) {
                const env = FilteringEnvironment.initialize();
                let state = FilteringEnvironment.extractState(env);
                let episodeReward = 0;
                
                while (!env.done && env.episodeStep < config.environment.maxEpisodeLength) {
                    const content = FilteringEnvironment.generateContent();
                    
                    // Select action without exploration
                    const oldExplorationRate = agent.explorationRate;
                    agent.explorationRate = 0;
                    const action = this.selectAction(agent, state);
                    agent.explorationRate = oldExplorationRate;
                    
                    const result = FilteringEnvironment.step(env, action, content);
                    
                    episodeReward += result.reward;
                    state = result.nextState;
                    totalActions++;
                    
                    // Check if action was correct
                    const isAd = content.type === 'ad';
                    const isBlocking = action < 3;
                    if ((isAd && isBlocking) || (!isAd && !isBlocking)) {
                        correctActions++;
                    }
                }
                
                totalReward += episodeReward;
            }
            
            const averageReward = totalReward / episodes;
            const accuracy = correctActions / totalActions;
            
            state.learningStats.averageReward = averageReward;
            state.learningStats.accuracy = accuracy;
            
            return {
                averageReward,
                accuracy,
                totalEpisodes: episodes,
                totalActions
            };
        }
    };

    /******************************************************************************/

    // Main Reinforcement Learning Engine Interface
    let initialized = false;

    // Initialize Reinforcement Learning Engine
    const initialize = async function() {
        if (initialized) return;
        
        console.log('[RL] Reinforcement Learning Engine v2.0.0 initializing...');
        
        try {
            // Initialize agent and environment
            state.agent = RLAgent.initialize();
            state.environment = FilteringEnvironment.initialize();
            
            // Initialize replay memory
            state.replayMemory = [];
            
            console.log('[RL] Reinforcement Learning Engine v2.0.0 initialized successfully');
            
            initialized = true;
            state.initialized = true;
            
        } catch (error) {
            console.error('[RL] Reinforcement Learning Engine initialization failed:', error);
            throw error;
        }
    };

    // Run training episode
    const runTrainingEpisode = async function() {
        if (!initialized) {
            throw new Error('Reinforcement Learning Engine not initialized');
        }
        
        console.log(`[RL] Running training episode ${state.currentEpisode + 1}`);
        
        try {
            // Reset environment
            const env = FilteringEnvironment.initialize();
            let currentState = FilteringEnvironment.extractState(env);
            let episodeReward = 0;
            
            while (!env.done && env.episodeStep < config.environment.maxEpisodeLength) {
                // Generate content to filter
                const content = FilteringEnvironment.generateContent();
                
                // Select action
                const action = RLAgent.selectAction(state.agent, currentState);
                
                // Execute action
                const result = FilteringEnvironment.step(env, action, content);
                
                // Store experience
                ReplayMemory.add(
                    currentState,
                    action,
                    result.reward,
                    result.nextState,
                    result.done
                );
                
                // Update state
                currentState = result.nextState;
                episodeReward += result.reward;
                state.totalSteps++;
                
                // Train on batch if enough experiences
                if (ReplayMemory.size() >= config.algorithm.batchSize) {
                    const batch = ReplayMemory.sample(config.algorithm.batchSize);
                    RLAgent.train(state.agent, batch);
                }
            }
            
            // Record episode
            state.episodeHistory.push({
                episode: state.currentEpisode,
                reward: episodeReward,
                steps: env.episodeStep,
                satisfaction: env.currentState.userSatisfaction,
                timestamp: Date.now()
            });
            
            state.currentEpisode++;
            state.learningStats.totalEpisodes++;
            
            // Evaluate periodically
            if (state.currentEpisode % config.training.evaluationFrequency === 0) {
                RLAgent.evaluate(state.agent, state.environment);
            }
            
            console.log(`[RL] Episode ${state.currentEpisode} completed with reward: ${episodeReward}`);
            
            return {
                episode: state.currentEpisode,
                reward: episodeReward,
                steps: env.episodeStep,
                explorationRate: state.agent.explorationRate
            };
            
        } catch (error) {
            console.error('[RL] Training episode failed:', error);
            throw error;
        }
    };

    // Make filtering decision
    const makeFilteringDecision = function(contentFeatures) {
        if (!initialized || !state.agent) {
            // Fallback to simple heuristic
            return {
                action: contentFeatures.reduce((sum, val) => sum + val, 0) > 0.5 ? 1 : 4,
                confidence: 0.5,
                reasoning: 'RL agent not available'
            };
        }
        
        try {
            // Create state from content features
            const stateVector = [...contentFeatures];
            while (stateVector.length < config.environment.stateSize) {
                stateVector.push(0);
            }
            
            // Get Q-values for all actions
            const prediction = DQN.forward(state.agent.network, stateVector.slice(0, config.environment.stateSize));
            const action = RLAgent.argmax(prediction.qValues);
            
            // Calculate confidence
            const qValues = prediction.qValues;
            const maxQ = Math.max(...qValues);
            const secondMaxQ = qValues.sort((a, b) => b - a)[1];
            const confidence = Math.min(1, Math.max(0, (maxQ - secondMaxQ) / Math.abs(maxQ)));
            
            // Map action to decision
            const actionTypes = [
                'block_aggressive',
                'block_moderate', 
                'block_conservative',
                'allow_conservative',
                'allow_moderate',
                'allow_aggressive',
                'request_feedback',
                'adaptive_learning'
            ];
            
            return {
                action: action,
                actionType: actionTypes[action],
                confidence: confidence,
                qValues: qValues,
                reasoning: `RL agent selected action ${action} (${actionTypes[action]}) with confidence ${confidence.toFixed(3)}`
            };
            
        } catch (error) {
            console.error('[RL] Filtering decision failed:', error);
            return {
                action: 4, // Default to moderate allow
                confidence: 0.1,
                reasoning: 'Error in RL agent'
            };
        }
    };

    // Provide feedback on filtering decision
    const provideFeedback = function(contentId, wasCorrect, userSatisfaction = null) {
        if (!initialized) return;
        
        try {
            // Find the experience in replay memory
            const recentExperiences = state.replayMemory.slice(-100);
            const experience = recentExperiences.find(exp => 
                exp.info && exp.info.content && exp.info.content.id === contentId
            );
            
            if (experience) {
                // Adjust reward based on feedback
                const rewardAdjustment = wasCorrect ? 10 : -10;
                experience.reward += rewardAdjustment;
                
                // Update user satisfaction if provided
                if (userSatisfaction !== null) {
                    if (state.environment) {
                        state.environment.currentState.userSatisfaction = Math.max(0, Math.min(1, userSatisfaction));
                    }
                }
                
                console.log(`[RL] Feedback received for ${contentId}: ${wasCorrect ? 'correct' : 'incorrect'}`);
            }
            
        } catch (error) {
            console.error('[RL] Feedback processing failed:', error);
        }
    };

    // Update configuration
    const updateConfig = function(newConfig) {
        Object.assign(config, newConfig);
        console.log('[RL] Configuration updated');
    };

    // Get statistics
    const getStatistics = function() {
        return {
            ...state.learningStats,
            currentEpisode: state.currentEpisode,
            totalSteps: state.totalSteps,
            memorySize: ReplayMemory.size(),
            recentEpisodes: state.episodeHistory.slice(-10),
            initialized: state.initialized
        };
    };

    // Save model
    const saveModel = function() {
        if (!initialized || !state.agent) {
            throw new Error('No model to save');
        }
        
        return {
            network: state.agent.network,
            explorationRate: state.agent.explorationRate,
            totalSteps: state.agent.totalSteps,
            config: config,
            timestamp: Date.now()
        };
    };

    // Load model
    const loadModel = function(modelData) {
        if (!initialized) {
            throw new Error('Engine not initialized');
        }
        
        state.agent.network = modelData.network;
        state.agent.explorationRate = modelData.explorationRate || config.algorithm.explorationRate;
        state.agent.totalSteps = modelData.totalSteps || 0;
        
        console.log('[RL] Model loaded successfully');
    };

    /******************************************************************************/

    // Public API
    return {
        initialize,
        runTrainingEpisode,
        makeFilteringDecision,
        provideFeedback,
        updateConfig,
        getStatistics,
        saveModel,
        loadModel,
        
        // Sub-modules for direct access
        DQN,
        FilteringEnvironment,
        ReplayMemory,
        RLAgent,
        
        // Configuration access
        get config() { return { ...config }; },
        get initialized() { return initialized; },
        get currentEpisode() { return state.currentEpisode; },
        get totalSteps() { return state.totalSteps; }
    };

})();

/******************************************************************************/

// Auto-initialize if in browser environment
if (typeof window !== 'undefined' && window.document) {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            ReinforcementLearningEngine.initialize().catch(console.error);
        });
    } else {
        ReinforcementLearningEngine.initialize().catch(console.error);
    }
}

/******************************************************************************/

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ReinforcementLearningEngine;
}
