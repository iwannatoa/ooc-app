/**
 * Custom ESLint rule to disallow 'as unknown as' type assertions
 * This rule specifically targets the pattern: (value as unknown as Type)
 */

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Disallow "as unknown as" type assertions',
      category: 'Best Practices',
      recommended: true,
    },
    fixable: null,
    schema: [],
    messages: {
      noUnknownAs:
        'Do not use "as unknown as" type assertions. Use proper typing or test helpers instead.',
    },
  },
  create(context) {
    return {
      TSAsExpression(node) {
        // Check if this is a nested type assertion: (expr as unknown as Type)
        // The expression itself must be a TSAsExpression with type 'unknown'
        if (
          node.expression.type === 'TSAsExpression' &&
          node.expression.typeAnnotation.type === 'TSTypeReference' &&
          node.expression.typeAnnotation.typeName &&
          node.expression.typeAnnotation.typeName.name === 'unknown'
        ) {
          context.report({
            node,
            messageId: 'noUnknownAs',
          });
        }
      },
    };
  },
};
