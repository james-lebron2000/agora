/**
 * Echo Survival Integration Example
 *
 * This example demonstrates the Consultant Agent with Echo Survival integration.
 * The survival functionality is now built into the ConsultantAgent class itself.
 *
 * @deprecated Survival is now integrated directly into ConsultantAgent
 */
import { createConsultantAgent } from './consultant.js';
/**
 * Example: Using Consultant Agent with Echo Survival
 */
export async function runSurvivalExample() {
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║     Agora Consultant Agent with Echo Survival Demo         ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');
    // Create consultant agent with survival monitoring
    const consultant = await createConsultantAgent('consultant-survival-demo');
    // Show survival report
    console.log('\n📊 Initial Survival Report:');
    console.log(consultant.getSurvivalReport());
    // Check if in survival mode
    if (consultant.isInSurvivalMode()) {
        console.warn('⚠️  Agent is in SURVIVAL MODE');
    }
    // Example task
    const taskRequest = {
        id: 'task-001',
        description: 'Translate "Hello world" to Spanish',
        capability: 'text-translation',
        budget: 0.01,
        humanClient: 'alice',
        preferredChain: 'base'
    };
    console.log('\n📝 Processing task...');
    const result = await consultant.receiveTask(taskRequest);
    // Show final survival status
    console.log('\n📊 Final Survival Report:');
    console.log(consultant.getSurvivalReport());
    // Stop monitoring
    consultant.stopSurvivalMonitoring();
}
// Run example if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    runSurvivalExample().catch(console.error);
}
//# sourceMappingURL=consultant-survival-example.js.map