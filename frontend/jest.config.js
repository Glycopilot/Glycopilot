module.exports = {
    preset: 'react-native',
    setupFiles: [
        '<rootDir>/jest.setup.js'
    ],
    setupFilesAfterEnv: [
        '@testing-library/jest-native/extend-expect'
    ],
    moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
    transformIgnorePatterns: [
        'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg)',
    ],
    collectCoverage: true,
    collectCoverageFrom: [
        'src/**/*.{ts,tsx}',
        '!src/**/*.d.ts',
        '!src/**/types.ts',
        '!src/**/__tests__/**',
        '!src/**/*.test.ts',
        '!src/**/*.test.tsx',
        '!src/screens/Activities.tsx',
        '!src/screens/meals.tsx',
        '!src/screens/medicins.tsx',
        '!src/screens/Journal.tsx',
        '!src/screens/Stats.tsx',
        '!src/screens/Medications.tsx',
        '!src/screens/Predictions.tsx',
        '!src/screens/SensorActivation.tsx',
        '!src/utils/pdfGenerator.ts',
        '!src/data/mockData.ts',
        '!src/components/medications/**',
        '!src/components/meals/**',
        '!src/navigation/navigation.tsx',
    ],
    coverageDirectory: 'coverage',
    coverageReporters: ['lcov', 'text', 'html'],
    moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1',
        '^@components/(.*)$': '<rootDir>/src/components/$1',
        '^@screens/(.*)$': '<rootDir>/src/screens/$1',
        '^@services/(.*)$': '<rootDir>/src/services/$1',
        '^@utils/(.*)$': '<rootDir>/src/utils/$1',
        '^@hooks/(.*)$': '<rootDir>/src/hooks/$1',
        '^@themes/(.*)$': '<rootDir>/src/themes/$1',
        '^@types/(.*)$': '<rootDir>/src/types/$1',
    },
};
