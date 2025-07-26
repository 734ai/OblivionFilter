/*******************************************************************************

    OblivionFilter - Federated Learning Engine v2.0.0
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

// Federated Learning Engine for Distributed Intelligence
// Enables collaborative model training while preserving privacy
const FederatedLearningEngine = (function() {

    /******************************************************************************/

    // Configuration
    const config = {
        enabled: true,
        
        // Federated learning settings
        federation: {
            enabled: true,
            aggregationMethod: 'fedavg', // fedavg, fedprox, fedopt
            minParticipants: 3,
            maxParticipants: 100,
            roundTimeout: 300000, // 5 minutes
            convergenceThreshold: 0.001,
            maxRounds: 1000
        },
        
        // Privacy settings
        privacy: {
            differentialPrivacy: true,
            epsilon: 1.0, // Privacy budget
            delta: 1e-5,
            secureAggregation: true,
            homomorphicEncryption: false // Future enhancement
        },
        
        // Model settings
        model: {
            architecture: 'feedforward',
            layers: [128, 64, 32, 16, 8],
            activationFunction: 'relu',
            outputActivation: 'sigmoid',
            learningRate: 0.001,
            batchSize: 32,
            localEpochs: 5
        },
        
        // Communication settings
        communication: {
            protocol: 'p2p', // p2p, centralized
            compressionEnabled: true,
            compressionRatio: 0.1,
            encryptionEnabled: true
        }
    };

    /******************************************************************************/

    // State management
    const state = {
        initialized: false,
        participantId: null,
        currentRound: 0,
        participants: new Map(),
        globalModel: null,
        localModel: null,
        trainingData: [],
        aggregationBuffer: new Map(),
        isCoordinator: false,
        federationStats: {
            totalRounds: 0,
            averageAccuracy: 0,
            participationRate: 0,
            modelUpdates: 0,
            dataPrivacyScore: 0
        }
    };

    /******************************************************************************/

    // Differential Privacy Module
    const PrivacyEngine = {
        
        // Add differential privacy noise
        addDifferentialPrivacyNoise(gradients, epsilon, delta) {
            const sensitivity = this.calculateSensitivity(gradients);
            const scale = sensitivity / epsilon;
            
            return gradients.map(gradient => {
                if (Array.isArray(gradient)) {
                    return gradient.map(value => {
                        const noise = this.generateLaplaceNoise(0, scale);
                        return value + noise;
                    });
                } else {
                    const noise = this.generateLaplaceNoise(0, scale);
                    return gradient + noise;
                }
            });
        },
        
        // Calculate gradient sensitivity
        calculateSensitivity(gradients) {
            let maxNorm = 0;
            
            gradients.forEach(gradient => {
                let norm = 0;
                if (Array.isArray(gradient)) {
                    norm = Math.sqrt(gradient.reduce((sum, val) => sum + val * val, 0));
                } else {
                    norm = Math.abs(gradient);
                }
                maxNorm = Math.max(maxNorm, norm);
            });
            
            return maxNorm;
        },
        
        // Generate Laplace noise
        generateLaplaceNoise(mean, scale) {
            const u = Math.random() - 0.5;
            return mean - scale * Math.sign(u) * Math.log(1 - 2 * Math.abs(u));
        },
        
        // Apply secure aggregation
        secureAggregation(modelUpdates) {
            console.log('[FedLearning] Applying secure aggregation...');
            
            // Simplified secure aggregation using additive secret sharing
            const aggregatedModel = this.averageModels(modelUpdates);
            
            // Add privacy noise
            if (config.privacy.differentialPrivacy) {
                return this.addDifferentialPrivacyNoise(
                    aggregatedModel,
                    config.privacy.epsilon,
                    config.privacy.delta
                );
            }
            
            return aggregatedModel;
        },
        
        // Average multiple models
        averageModels(models) {
            if (models.length === 0) return null;
            
            const averaged = JSON.parse(JSON.stringify(models[0]));
            
            // Average weights for each layer
            for (let layerIdx = 0; layerIdx < averaged.length; layerIdx++) {
                const layer = averaged[layerIdx];
                
                // Average weights
                if (layer.weights) {
                    for (let i = 0; i < layer.weights.length; i++) {
                        for (let j = 0; j < layer.weights[i].length; j++) {
                            let sum = 0;
                            models.forEach(model => {
                                sum += model[layerIdx].weights[i][j];
                            });
                            layer.weights[i][j] = sum / models.length;
                        }
                    }
                }
                
                // Average biases
                if (layer.biases) {
                    for (let i = 0; i < layer.biases.length; i++) {
                        let sum = 0;
                        models.forEach(model => {
                            sum += model[layerIdx].biases[i];
                        });
                        layer.biases[i] = sum / models.length;
                    }
                }
            }
            
            return averaged;
        },
        
        // Calculate privacy score
        calculatePrivacyScore(epsilon, delta, participants) {
            // Privacy accounting using composition theorems
            const composedEpsilon = epsilon * Math.sqrt(2 * Math.log(1.25 / delta));
            const privacyLoss = 1 - Math.exp(-composedEpsilon);
            
            // Adjust for number of participants
            const participantFactor = Math.min(1, 10 / participants);
            
            return Math.max(0, 1 - privacyLoss * participantFactor);
        }
    };

    /******************************************************************************/

    // Neural Network Model
    const NeuralNetwork = {
        
        // Initialize neural network
        initialize(inputSize, architecture) {
            console.log('[FedLearning] Initializing neural network...');
            
            const layers = [];
            let previousSize = inputSize;
            
            architecture.forEach((size, index) => {
                const layer = {
                    size: size,
                    weights: this.initializeWeights(previousSize, size),
                    biases: this.initializeBiases(size),
                    activation: index === architecture.length - 1 ? 
                               config.model.outputActivation : 
                               config.model.activationFunction
                };
                
                layers.push(layer);
                previousSize = size;
            });
            
            return layers;
        },
        
        // Initialize weights using Xavier initialization
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
        
        // Initialize biases to zero
        initializeBiases(size) {
            return new Array(size).fill(0);
        },
        
        // Forward pass
        forward(model, input) {
            let activation = input;
            const activations = [activation];
            
            model.forEach(layer => {
                activation = this.layerForward(activation, layer);
                activations.push(activation);
            });
            
            return {
                output: activation,
                activations: activations
            };
        },
        
        // Layer forward pass
        layerForward(input, layer) {
            const output = new Array(layer.size).fill(0);
            
            // Matrix multiplication + bias
            for (let j = 0; j < layer.size; j++) {
                for (let i = 0; i < input.length; i++) {
                    output[j] += input[i] * layer.weights[i][j];
                }
                output[j] += layer.biases[j];
            }
            
            // Apply activation function
            return output.map(x => this.applyActivation(x, layer.activation));
        },
        
        // Apply activation function
        applyActivation(x, activationType) {
            switch (activationType) {
                case 'relu':
                    return Math.max(0, x);
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
        
        // Backward pass (gradient computation)
        backward(model, input, target, output) {
            const gradients = [];
            let delta = this.calculateOutputDelta(output.output, target);
            
            // Backpropagate through layers
            for (let layerIdx = model.length - 1; layerIdx >= 0; layerIdx--) {
                const layer = model[layerIdx];
                const layerInput = layerIdx === 0 ? input : output.activations[layerIdx];
                
                const layerGradients = this.calculateLayerGradients(layer, layerInput, delta);
                gradients.unshift(layerGradients);
                
                // Calculate delta for previous layer
                if (layerIdx > 0) {
                    delta = this.calculatePreviousDelta(layer, delta, output.activations[layerIdx]);
                }
            }
            
            return gradients;
        },
        
        // Calculate output layer delta
        calculateOutputDelta(output, target) {
            return output.map((out, i) => out - target[i]);
        },
        
        // Calculate gradients for a layer
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
        
        // Update model with gradients
        updateModel(model, gradients, learningRate) {
            model.forEach((layer, layerIdx) => {
                const layerGradients = gradients[layerIdx];
                
                // Update weights
                for (let i = 0; i < layer.weights.length; i++) {
                    for (let j = 0; j < layer.weights[i].length; j++) {
                        layer.weights[i][j] -= learningRate * layerGradients.weights[i][j];
                    }
                }
                
                // Update biases
                for (let j = 0; j < layer.biases.length; j++) {
                    layer.biases[j] -= learningRate * layerGradients.biases[j];
                }
            });
        }
    };

    /******************************************************************************/

    // Federated Aggregation Algorithms
    const FederatedAlgorithms = {
        
        // FedAvg algorithm
        fedAvg(modelUpdates, participantWeights) {
            console.log('[FedLearning] Applying FedAvg aggregation...');
            
            if (modelUpdates.length === 0) return null;
            
            // Weighted average based on data size
            const totalWeight = participantWeights.reduce((sum, weight) => sum + weight, 0);
            const weightedModels = modelUpdates.map((model, index) => {
                const weight = participantWeights[index] / totalWeight;
                return this.scaleModel(model, weight);
            });
            
            return this.sumModels(weightedModels);
        },
        
        // FedProx algorithm (with proximal term)
        fedProx(modelUpdates, participantWeights, globalModel, mu = 0.01) {
            console.log('[FedLearning] Applying FedProx aggregation...');
            
            // Apply proximal regularization
            const proximalUpdates = modelUpdates.map(model => {
                return this.applyProximalRegularization(model, globalModel, mu);
            });
            
            // Standard FedAvg on regularized updates
            return this.fedAvg(proximalUpdates, participantWeights);
        },
        
        // FedOpt algorithm (with server optimization)
        fedOpt(modelUpdates, participantWeights, serverOptimizer) {
            console.log('[FedLearning] Applying FedOpt aggregation...');
            
            // Compute pseudo-gradients
            const pseudoGradients = this.computePseudoGradients(modelUpdates, state.globalModel);
            
            // Apply server optimizer (Adam, SGD, etc.)
            return this.applyServerOptimizer(pseudoGradients, serverOptimizer);
        },
        
        // Scale model by factor
        scaleModel(model, factor) {
            return model.map(layer => ({
                ...layer,
                weights: layer.weights.map(row => row.map(weight => weight * factor)),
                biases: layer.biases.map(bias => bias * factor)
            }));
        },
        
        // Sum multiple models
        sumModels(models) {
            if (models.length === 0) return null;
            
            const result = JSON.parse(JSON.stringify(models[0]));
            
            for (let modelIdx = 1; modelIdx < models.length; modelIdx++) {
                const model = models[modelIdx];
                
                for (let layerIdx = 0; layerIdx < result.length; layerIdx++) {
                    const resultLayer = result[layerIdx];
                    const modelLayer = model[layerIdx];
                    
                    // Sum weights
                    for (let i = 0; i < resultLayer.weights.length; i++) {
                        for (let j = 0; j < resultLayer.weights[i].length; j++) {
                            resultLayer.weights[i][j] += modelLayer.weights[i][j];
                        }
                    }
                    
                    // Sum biases
                    for (let j = 0; j < resultLayer.biases.length; j++) {
                        resultLayer.biases[j] += modelLayer.biases[j];
                    }
                }
            }
            
            return result;
        },
        
        // Apply proximal regularization
        applyProximalRegularization(localModel, globalModel, mu) {
            const regularizedModel = JSON.parse(JSON.stringify(localModel));
            
            localModel.forEach((layer, layerIdx) => {
                const globalLayer = globalModel[layerIdx];
                const regLayer = regularizedModel[layerIdx];
                
                // Regularize weights
                for (let i = 0; i < layer.weights.length; i++) {
                    for (let j = 0; j < layer.weights[i].length; j++) {
                        const proximalTerm = mu * (layer.weights[i][j] - globalLayer.weights[i][j]);
                        regLayer.weights[i][j] -= proximalTerm;
                    }
                }
                
                // Regularize biases
                for (let j = 0; j < layer.biases.length; j++) {
                    const proximalTerm = mu * (layer.biases[j] - globalLayer.biases[j]);
                    regLayer.biases[j] -= proximalTerm;
                }
            });
            
            return regularizedModel;
        },
        
        // Compute pseudo-gradients
        computePseudoGradients(modelUpdates, globalModel) {
            return modelUpdates.map(model => {
                return this.subtractModels(globalModel, model);
            });
        },
        
        // Subtract two models
        subtractModels(model1, model2) {
            const result = JSON.parse(JSON.stringify(model1));
            
            model1.forEach((layer, layerIdx) => {
                const layer2 = model2[layerIdx];
                const resultLayer = result[layerIdx];
                
                // Subtract weights
                for (let i = 0; i < layer.weights.length; i++) {
                    for (let j = 0; j < layer.weights[i].length; j++) {
                        resultLayer.weights[i][j] -= layer2.weights[i][j];
                    }
                }
                
                // Subtract biases
                for (let j = 0; j < layer.biases.length; j++) {
                    resultLayer.biases[j] -= layer2.biases[j];
                }
            });
            
            return result;
        },
        
        // Apply server optimizer
        applyServerOptimizer(pseudoGradients, optimizer) {
            // Simplified server-side optimization
            const avgGradient = this.averageGradients(pseudoGradients);
            
            // Apply to global model
            const updatedModel = JSON.parse(JSON.stringify(state.globalModel));
            
            avgGradient.forEach((layer, layerIdx) => {
                const modelLayer = updatedModel[layerIdx];
                
                // Update weights
                for (let i = 0; i < layer.weights.length; i++) {
                    for (let j = 0; j < layer.weights[i].length; j++) {
                        modelLayer.weights[i][j] += optimizer.learningRate * layer.weights[i][j];
                    }
                }
                
                // Update biases
                for (let j = 0; j < layer.biases.length; j++) {
                    modelLayer.biases[j] += optimizer.learningRate * layer.biases[j];
                }
            });
            
            return updatedModel;
        },
        
        // Average gradients
        averageGradients(gradients) {
            if (gradients.length === 0) return null;
            
            const averaged = JSON.parse(JSON.stringify(gradients[0]));
            
            for (let gradIdx = 1; gradIdx < gradients.length; gradIdx++) {
                const gradient = gradients[gradIdx];
                
                gradient.forEach((layer, layerIdx) => {
                    const avgLayer = averaged[layerIdx];
                    
                    // Average weights
                    for (let i = 0; i < layer.weights.length; i++) {
                        for (let j = 0; j < layer.weights[i].length; j++) {
                            avgLayer.weights[i][j] += layer.weights[i][j];
                        }
                    }
                    
                    // Average biases
                    for (let j = 0; j < layer.biases.length; j++) {
                        avgLayer.biases[j] += layer.biases[j];
                    }
                });
            }
            
            // Divide by number of gradients
            averaged.forEach(layer => {
                for (let i = 0; i < layer.weights.length; i++) {
                    for (let j = 0; j < layer.weights[i].length; j++) {
                        layer.weights[i][j] /= gradients.length;
                    }
                }
                
                for (let j = 0; j < layer.biases.length; j++) {
                    layer.biases[j] /= gradients.length;
                }
            });
            
            return averaged;
        }
    };

    /******************************************************************************/

    // Communication Manager
    const CommunicationManager = {
        
        // Broadcast global model
        broadcastGlobalModel(model) {
            console.log('[FedLearning] Broadcasting global model...');
            
            const compressedModel = config.communication.compressionEnabled ? 
                                  this.compressModel(model) : model;
            
            const encryptedModel = config.communication.encryptionEnabled ?
                                 this.encryptModel(compressedModel) : compressedModel;
            
            // Simulate broadcasting to participants
            state.participants.forEach((participant, participantId) => {
                if (participantId !== state.participantId) {
                    this.sendModelUpdate(participantId, encryptedModel);
                }
            });
        },
        
        // Send model update to participant
        sendModelUpdate(participantId, model) {
            // In real implementation, this would use P2P network or federation server
            console.log(`[FedLearning] Sending model update to participant: ${participantId}`);
        },
        
        // Receive model update from participant
        receiveModelUpdate(participantId, modelUpdate) {
            console.log(`[FedLearning] Received model update from participant: ${participantId}`);
            
            const decryptedModel = config.communication.encryptionEnabled ?
                                 this.decryptModel(modelUpdate) : modelUpdate;
            
            const decompressedModel = config.communication.compressionEnabled ?
                                    this.decompressModel(decryptedModel) : decryptedModel;
            
            state.aggregationBuffer.set(participantId, decompressedModel);
        },
        
        // Compress model
        compressModel(model) {
            // Simplified compression using quantization
            return model.map(layer => ({
                ...layer,
                weights: layer.weights.map(row => 
                    row.map(weight => Math.round(weight * 1000) / 1000)
                ),
                biases: layer.biases.map(bias => Math.round(bias * 1000) / 1000)
            }));
        },
        
        // Decompress model
        decompressModel(compressedModel) {
            // No actual decompression needed for quantization
            return compressedModel;
        },
        
        // Encrypt model
        encryptModel(model) {
            // Simplified encryption (in real implementation, use proper cryptography)
            const modelString = JSON.stringify(model);
            const encrypted = btoa(modelString); // Base64 encoding as placeholder
            return { encrypted: encrypted };
        },
        
        // Decrypt model
        decryptModel(encryptedModel) {
            // Simplified decryption
            const modelString = atob(encryptedModel.encrypted);
            return JSON.parse(modelString);
        }
    };

    /******************************************************************************/

    // Main Federated Learning Engine Interface
    let initialized = false;

    // Initialize Federated Learning Engine
    const initialize = async function(inputSize = 50) {
        if (initialized) return;
        
        console.log('[FedLearning] Federated Learning Engine v2.0.0 initializing...');
        
        try {
            // Generate participant ID
            state.participantId = 'participant_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            
            // Initialize global model
            state.globalModel = NeuralNetwork.initialize(inputSize, config.model.layers);
            state.localModel = JSON.parse(JSON.stringify(state.globalModel));
            
            // Initialize training data
            state.trainingData = await this.generateSyntheticTrainingData(inputSize);
            
            // Set up federation
            await this.joinFederation();
            
            initialized = true;
            state.initialized = true;
            
            console.log('[FedLearning] Federated Learning Engine v2.0.0 initialized successfully');
            console.log(`[FedLearning] Participant ID: ${state.participantId}`);
            
        } catch (error) {
            console.error('[FedLearning] Federated Learning Engine initialization failed:', error);
            throw error;
        }
    };

    // Generate synthetic training data
    const generateSyntheticTrainingData = async function(inputSize) {
        const data = [];
        const numSamples = 1000;
        
        for (let i = 0; i < numSamples; i++) {
            const input = new Array(inputSize).fill(0).map(() => Math.random());
            const target = [Math.random() > 0.5 ? 1 : 0]; // Binary classification
            data.push({ input, target });
        }
        
        console.log(`[FedLearning] Generated ${numSamples} synthetic training samples`);
        return data;
    };

    // Join federation
    const joinFederation = async function() {
        console.log('[FedLearning] Joining federation...');
        
        // Simulate joining a federation
        state.participants.set(state.participantId, {
            id: state.participantId,
            dataSize: state.trainingData.length,
            joinedAt: Date.now(),
            rounds: 0
        });
        
        // Check if coordinator
        state.isCoordinator = state.participants.size === 1;
        
        console.log(`[FedLearning] Joined federation as ${state.isCoordinator ? 'coordinator' : 'participant'}`);
    };

    // Start federated training round
    const startTrainingRound = async function() {
        if (!initialized) {
            throw new Error('Federated Learning Engine not initialized');
        }
        
        console.log(`[FedLearning] Starting training round ${state.currentRound + 1}`);
        
        try {
            // Local training
            const localUpdate = await this.performLocalTraining();
            
            // Add privacy noise if enabled
            const privateUpdate = config.privacy.differentialPrivacy ?
                                PrivacyEngine.addDifferentialPrivacyNoise(
                                    localUpdate, 
                                    config.privacy.epsilon,
                                    config.privacy.delta
                                ) : localUpdate;
            
            // Send update to coordinator
            if (state.isCoordinator) {
                state.aggregationBuffer.set(state.participantId, privateUpdate);
                await this.performAggregation();
            } else {
                CommunicationManager.sendModelUpdate('coordinator', privateUpdate);
            }
            
            state.currentRound++;
            state.federationStats.totalRounds++;
            
            console.log(`[FedLearning] Training round ${state.currentRound} completed`);
            
        } catch (error) {
            console.error('[FedLearning] Training round failed:', error);
            throw error;
        }
    };

    // Perform local training
    const performLocalTraining = async function() {
        console.log('[FedLearning] Performing local training...');
        
        const batchSize = config.model.batchSize;
        const epochs = config.model.localEpochs;
        const learningRate = config.model.learningRate;
        
        // Train for specified epochs
        for (let epoch = 0; epoch < epochs; epoch++) {
            // Shuffle training data
            const shuffledData = [...state.trainingData].sort(() => Math.random() - 0.5);
            
            // Process in batches
            for (let i = 0; i < shuffledData.length; i += batchSize) {
                const batch = shuffledData.slice(i, i + batchSize);
                await this.processBatch(batch, learningRate);
            }
        }
        
        return JSON.parse(JSON.stringify(state.localModel));
    };

    // Process training batch
    const processBatch = async function(batch, learningRate) {
        const batchGradients = [];
        
        // Compute gradients for each sample in batch
        batch.forEach(sample => {
            const output = NeuralNetwork.forward(state.localModel, sample.input);
            const gradients = NeuralNetwork.backward(state.localModel, sample.input, sample.target, output);
            batchGradients.push(gradients);
        });
        
        // Average gradients
        const avgGradients = this.averageBatchGradients(batchGradients);
        
        // Update local model
        NeuralNetwork.updateModel(state.localModel, avgGradients, learningRate);
    };

    // Average gradients from batch
    const averageBatchGradients = function(batchGradients) {
        if (batchGradients.length === 0) return [];
        
        const averaged = JSON.parse(JSON.stringify(batchGradients[0]));
        
        for (let gradIdx = 1; gradIdx < batchGradients.length; gradIdx++) {
            const gradients = batchGradients[gradIdx];
            
            gradients.forEach((layerGrad, layerIdx) => {
                const avgLayerGrad = averaged[layerIdx];
                
                // Average weight gradients
                for (let i = 0; i < layerGrad.weights.length; i++) {
                    for (let j = 0; j < layerGrad.weights[i].length; j++) {
                        avgLayerGrad.weights[i][j] += layerGrad.weights[i][j];
                    }
                }
                
                // Average bias gradients
                for (let j = 0; j < layerGrad.biases.length; j++) {
                    avgLayerGrad.biases[j] += layerGrad.biases[j];
                }
            });
        }
        
        // Divide by batch size
        averaged.forEach(layerGrad => {
            for (let i = 0; i < layerGrad.weights.length; i++) {
                for (let j = 0; j < layerGrad.weights[i].length; j++) {
                    layerGrad.weights[i][j] /= batchGradients.length;
                }
            }
            
            for (let j = 0; j < layerGrad.biases.length; j++) {
                layerGrad.biases[j] /= batchGradients.length;
            }
        });
        
        return averaged;
    };

    // Perform model aggregation (coordinator only)
    const performAggregation = async function() {
        if (!state.isCoordinator) return;
        
        console.log('[FedLearning] Performing model aggregation...');
        
        const modelUpdates = Array.from(state.aggregationBuffer.values());
        const participantWeights = modelUpdates.map(() => 1); // Equal weights for simplicity
        
        // Apply selected aggregation algorithm
        let aggregatedModel;
        switch (config.federation.aggregationMethod) {
            case 'fedavg':
                aggregatedModel = FederatedAlgorithms.fedAvg(modelUpdates, participantWeights);
                break;
            case 'fedprox':
                aggregatedModel = FederatedAlgorithms.fedProx(modelUpdates, participantWeights, state.globalModel);
                break;
            case 'fedopt':
                aggregatedModel = FederatedAlgorithms.fedOpt(modelUpdates, participantWeights, { learningRate: 0.01 });
                break;
            default:
                aggregatedModel = FederatedAlgorithms.fedAvg(modelUpdates, participantWeights);
        }
        
        // Apply secure aggregation if enabled
        if (config.privacy.secureAggregation) {
            aggregatedModel = PrivacyEngine.secureAggregation(modelUpdates);
        }
        
        // Update global model
        state.globalModel = aggregatedModel;
        state.localModel = JSON.parse(JSON.stringify(aggregatedModel));
        
        // Broadcast updated model
        CommunicationManager.broadcastGlobalModel(aggregatedModel);
        
        // Clear aggregation buffer
        state.aggregationBuffer.clear();
        
        // Update statistics
        state.federationStats.modelUpdates++;
        state.federationStats.participationRate = modelUpdates.length / state.participants.size;
        state.federationStats.dataPrivacyScore = PrivacyEngine.calculatePrivacyScore(
            config.privacy.epsilon,
            config.privacy.delta,
            state.participants.size
        );
        
        console.log('[FedLearning] Model aggregation completed');
    };

    // Evaluate model performance
    const evaluateModel = function(testData = null) {
        if (!testData) {
            testData = state.trainingData.slice(0, 100); // Use subset for evaluation
        }
        
        let correct = 0;
        let total = testData.length;
        
        testData.forEach(sample => {
            const output = NeuralNetwork.forward(state.localModel, sample.input);
            const prediction = output.output[0] > 0.5 ? 1 : 0;
            const actual = sample.target[0];
            
            if (prediction === actual) {
                correct++;
            }
        });
        
        const accuracy = correct / total;
        state.federationStats.averageAccuracy = accuracy;
        
        return { accuracy, correct, total };
    };

    // Update configuration
    const updateConfig = function(newConfig) {
        Object.assign(config, newConfig);
        console.log('[FedLearning] Configuration updated');
    };

    // Get statistics
    const getStatistics = function() {
        return {
            ...state.federationStats,
            currentRound: state.currentRound,
            participantId: state.participantId,
            isCoordinator: state.isCoordinator,
            participantCount: state.participants.size,
            trainingDataSize: state.trainingData.length,
            initialized: state.initialized
        };
    };

    /******************************************************************************/

    // Public API
    return {
        initialize,
        startTrainingRound,
        evaluateModel,
        updateConfig,
        getStatistics,
        
        // Sub-modules for direct access
        PrivacyEngine,
        NeuralNetwork,
        FederatedAlgorithms,
        CommunicationManager,
        
        // Configuration access
        get config() { return { ...config }; },
        get initialized() { return initialized; },
        get participantId() { return state.participantId; },
        get isCoordinator() { return state.isCoordinator; }
    };

})();

/******************************************************************************/

// Auto-initialize if in browser environment
if (typeof window !== 'undefined' && window.document) {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            FederatedLearningEngine.initialize().catch(console.error);
        });
    } else {
        FederatedLearningEngine.initialize().catch(console.error);
    }
}

/******************************************************************************/

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FederatedLearningEngine;
}
