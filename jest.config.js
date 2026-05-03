export default {
    testEnvironment: 'jsdom',
    transform: {},
    extensionsToTreatAsEsm: ['.js'],
    testMatch: ['**/*.test.js'],
    moduleNameMapper: {
        '^(\\.{1,2}/.*)\\.js$': '$1'
    }
};
