// Test script for the new function extraction flow
// This demonstrates the two-step process: extract functions first, then generate quiz

const fs = require('fs');
const path = require('path');

// Sample code for testing
const sampleCode = `
// File: utils.js
function calculateTotal(items) {
  let total = 0;
  for (const item of items) {
    if (item.price && item.quantity) {
      total += item.price * item.quantity;
    }
  }
  return total;
}

function formatCurrency(amount) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(amount);
}

// File: api.js
async function fetchUserData(userId) {
  try {
    const response = await fetch(\`/api/users/\${userId}\`);
    if (!response.ok) {
      throw new Error(\`Failed to fetch user: \${response.status}\`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching user data:', error);
    throw error;
  }
}

function validateEmail(email) {
  const emailRegex = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/;
  return emailRegex.test(email);
}
`;

async function testFunctionExtraction() {
  console.log('🧪 Testing new function extraction flow...\n');

  try {
    // Step 1: Extract functions
    console.log('Step 1: Extracting functions from code...');
    const extractResponse = await fetch('http://localhost:3000/api/extractFunctions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        code: sampleCode,
        repositoryInfo: {
          name: 'test-repo',
          owner: 'test-user'
        }
      })
    });

    if (!extractResponse.ok) {
      throw new Error(`Extract API failed: ${extractResponse.status}`);
    }

    const extractResult = await extractResponse.json();
    console.log('✅ Function extraction result:');
    console.log(`   - Success: ${extractResult.success}`);
    console.log(`   - Functions found: ${extractResult.count}`);
    console.log(`   - Files processed: ${extractResult.filesProcessed}`);
    console.log(`   - Message: ${extractResult.message}\n`);

    if (extractResult.functions && extractResult.functions.length > 0) {
      console.log('📝 Sample extracted functions:');
      extractResult.functions.slice(0, 2).forEach((func, index) => {
        console.log(`   ${index + 1}. ${func.name} (${func.language}, ${func.lineCount} lines)`);
        console.log(`      Description: ${func.description || 'No description'}`);
      });
      console.log('');

      // Step 2: Generate quiz using extracted functions
      console.log('Step 2: Generating quiz using extracted functions...');
      const quizResponse = await fetch('http://localhost:3000/api/generateQuiz', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code: sampleCode,
          extractedFunctions: extractResult.functions,
          numQuestions: 5,
          difficulty: 'medium',
          repositoryInfo: {
            name: 'test-repo',
            owner: 'test-user'
          }
        })
      });

      if (!quizResponse.ok) {
        throw new Error(`Quiz API failed: ${quizResponse.status}`);
      }

      const quizResult = await quizResponse.json();
      console.log('✅ Quiz generation result:');
      console.log(`   - Success: ${quizResult.success}`);
      console.log(`   - Questions generated: ${quizResult.quiz?.questions?.length || 0}`);
      console.log(`   - Message: ${quizResult.message}\n`);

      if (quizResult.quiz?.questions && quizResult.quiz.questions.length > 0) {
        console.log('📝 Sample questions:');
        quizResult.quiz.questions.slice(0, 2).forEach((question, index) => {
          console.log(`   ${index + 1}. ${question.type}: ${question.question}`);
          if (question.options && question.options.length > 0) {
            console.log(`      Options: ${question.options.length} choices`);
          }
        });
      }
    } else {
      console.log('⚠️ No functions were extracted from the sample code');
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.log('\n💡 Make sure your Next.js server is running on localhost:3000');
  }
}

// Run the test
testFunctionExtraction();



