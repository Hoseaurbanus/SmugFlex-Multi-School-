<?php
/**
 * Database Transaction Helper
 * SMugFlex 2.0 Multi-School Platform
 */

class DatabaseTransaction {
    private $pdo;
    private $inTransaction = false;
    private $savepoints = [];
    
    public function __construct($pdo) {
        if (!$pdo instanceof PDO) {
            throw new InvalidArgumentException('PDO instance required');
        }
        $this->pdo = $pdo;
    }
    
    /**
     * Begin a new transaction
     */
    public function begin() {
        if ($this->inTransaction) {
            throw new RuntimeException('Transaction already in progress');
        }
        
        try {
            $this->pdo->beginTransaction();
            $this->inTransaction = true;
            return true;
        } catch (PDOException $e) {
            throw new RuntimeException('Failed to begin transaction: ' . $e->getMessage(), 0, $e);
        }
    }
    
    /**
     * Commit the current transaction
     */
    public function commit() {
        if (!$this->inTransaction) {
            throw new RuntimeException('No transaction in progress');
        }
        
        try {
            $this->pdo->commit();
            $this->inTransaction = false;
            $this->savepoints = [];
            return true;
        } catch (PDOException $e) {
            throw new RuntimeException('Failed to commit transaction: ' . $e->getMessage(), 0, $e);
        }
    }
    
    /**
     * Rollback the current transaction
     */
    public function rollback() {
        if (!$this->inTransaction) {
            throw new RuntimeException('No transaction in progress');
        }
        
        try {
            $this->pdo->rollBack();
            $this->inTransaction = false;
            $this->savepoints = [];
            return true;
        } catch (PDOException $e) {
            throw new RuntimeException('Failed to rollback transaction: ' . $e->getMessage(), 0, $e);
        }
    }
    
    /**
     * Create a savepoint
     */
    public function savepoint($name) {
        if (!$this->inTransaction) {
            throw new RuntimeException('No transaction in progress');
        }
        
        if (empty($name)) {
            throw new InvalidArgumentException('Savepoint name cannot be empty');
        }
        
        if (in_array($name, $this->savepoints)) {
            throw new InvalidArgumentException("Savepoint '{$name}' already exists");
        }
        
        try {
            $this->pdo->exec("SAVEPOINT {$name}");
            $this->savepoints[] = $name;
            return true;
        } catch (PDOException $e) {
            throw new RuntimeException("Failed to create savepoint '{$name}': " . $e->getMessage(), 0, $e);
        }
    }
    
    /**
     * Rollback to a specific savepoint
     */
    public function rollbackToSavepoint($name) {
        if (!$this->inTransaction) {
            throw new RuntimeException('No transaction in progress');
        }
        
        if (!in_array($name, $this->savepoints)) {
            throw new InvalidArgumentException("Savepoint '{$name}' does not exist");
        }
        
        try {
            $this->pdo->exec("ROLLBACK TO SAVEPOINT {$name}");
            
            // Remove this savepoint and any after it
            $index = array_search($name, $this->savepoints);
            $this->savepoints = array_slice($this->savepoints, 0, $index);
            
            return true;
        } catch (PDOException $e) {
            throw new RuntimeException("Failed to rollback to savepoint '{$name}': " . $e->getMessage(), 0, $e);
        }
    }
    
    /**
     * Release a savepoint
     */
    public function releaseSavepoint($name) {
        if (!$this->inTransaction) {
            throw new RuntimeException('No transaction in progress');
        }
        
        if (!in_array($name, $this->savepoints)) {
            throw new InvalidArgumentException("Savepoint '{$name}' does not exist");
        }
        
        try {
            $this->pdo->exec("RELEASE SAVEPOINT {$name}");
            
            // Remove savepoint from list
            $index = array_search($name, $this->savepoints);
            array_splice($this->savepoints, $index, 1);
            
            return true;
        } catch (PDOException $e) {
            throw new RuntimeException("Failed to release savepoint '{$name}': " . $e->getMessage(), 0, $e);
        }
    }
    
    /**
     * Check if currently in a transaction
     */
    public function isInTransaction() {
        return $this->inTransaction;
    }
    
    /**
     * Get active savepoints
     */
    public function getSavepoints() {
        return $this->savepoints;
    }
    
    /**
     * Execute a callback within a transaction
     * Automatically handles commit/rollback based on success/failure
     */
    public function execute(callable $callback) {
        if ($this->inTransaction) {
            throw new RuntimeException('Cannot nest transactions');
        }
        
        $this->begin();
        
        try {
            $result = $callback($this);
            $this->commit();
            return $result;
        } catch (Exception $e) {
            $this->rollback();
            throw $e;
        }
    }
    
    /**
     * Execute multiple operations atomically
     */
    public function executeMultiple(array $operations) {
        if ($this->inTransaction) {
            throw new RuntimeException('Cannot nest transactions');
        }
        
        $this->begin();
        $results = [];
        
        try {
            foreach ($operations as $operation) {
                if (!is_callable($operation)) {
                    throw new InvalidArgumentException('All operations must be callable');
                }
                $results[] = $operation($this);
            }
            
            $this->commit();
            return $results;
        } catch (Exception $e) {
            $this->rollback();
            throw $e;
        }
    }
}

/**
 * Transaction helper functions
 */
function withTransaction($pdo, callable $callback) {
    $transaction = new DatabaseTransaction($pdo);
    return $transaction->execute($callback);
}

function executeInTransaction($pdo, array $operations) {
    $transaction = new DatabaseTransaction($pdo);
    return $transaction->executeMultiple($operations);
}
?>
