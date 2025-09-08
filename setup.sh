#!/bin/bash

# WarungChain Backend Setup Script
# This script automates the setup process for the backend

set -e  # Exit on any error

echo "🚀 Starting WarungChain Backend Setup..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Node.js is installed
check_nodejs() {
    print_status "Checking Node.js installation..."
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed. Please install Node.js 18+ first."
        exit 1
    fi
    
    NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -lt 18 ]; then
        print_error "Node.js version 18+ is required. Current version: $(node -v)"
        exit 1
    fi
    
    print_success "Node.js $(node -v) is installed"
}

# Check if npm is installed
check_npm() {
    print_status "Checking npm installation..."
    if ! command -v npm &> /dev/null; then
        print_error "npm is not installed. Please install npm first."
        exit 1
    fi
    
    print_success "npm $(npm -v) is installed"
}

# Check if PostgreSQL is installed
check_postgresql() {
    print_status "Checking PostgreSQL installation..."
    if ! command -v psql &> /dev/null; then
        print_warning "PostgreSQL is not installed or not in PATH."
        print_warning "Please install PostgreSQL 12+ and ensure psql is available."
        print_warning "You can download it from: https://www.postgresql.org/download/"
        read -p "Continue anyway? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    else
        print_success "PostgreSQL is installed"
    fi
}

# Install dependencies
install_dependencies() {
    print_status "Installing npm dependencies..."
    npm install
    print_success "Dependencies installed successfully"
}

# Setup environment file
setup_environment() {
    print_status "Setting up environment configuration..."
    
    if [ ! -f .env ]; then
        if [ -f env.example ]; then
            cp env.example .env
            print_success "Environment file created from example"
        else
            print_error "env.example file not found"
            exit 1
        fi
    else
        print_warning ".env file already exists. Skipping..."
    fi
    
    print_warning "Please edit .env file with your database configuration and other settings"
}

# Setup database
setup_database() {
    print_status "Setting up database..."
    
    # Check if database setup script exists
    if [ -f database-setup.sql ]; then
        print_warning "Database setup script found. Please run it manually:"
        echo "psql -U postgres -f database-setup.sql"
    fi
    
    # Generate Prisma client
    print_status "Generating Prisma client..."
    npm run db:generate
    
    # Push schema to database
    print_status "Pushing database schema..."
    npm run db:push
    
    print_success "Database setup completed"
}

# Seed database
seed_database() {
    print_status "Seeding database with sample data..."
    
    read -p "Do you want to seed the database with sample data? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        npm run db:seed
        print_success "Database seeded successfully"
    else
        print_warning "Database seeding skipped"
    fi
}

# Create uploads directory
create_uploads_dir() {
    print_status "Creating uploads directory..."
    mkdir -p uploads
    print_success "Uploads directory created"
}

# Setup git hooks (optional)
setup_git_hooks() {
    print_status "Setting up git hooks..."
    
    if [ -d .git ]; then
        # Create pre-commit hook for linting
        cat > .git/hooks/pre-commit << 'EOF'
#!/bin/bash
echo "Running pre-commit checks..."
npm run lint
EOF
        chmod +x .git/hooks/pre-commit
        print_success "Git hooks configured"
    else
        print_warning "Not a git repository. Skipping git hooks setup"
    fi
}

# Test the setup
test_setup() {
    print_status "Testing the setup..."
    
    # Test if server can start
    print_status "Testing server startup..."
    timeout 10s npm start &
    SERVER_PID=$!
    
    sleep 5
    
    # Check if server is running
    if curl -s http://localhost:3001/health > /dev/null; then
        print_success "Server is running correctly"
        kill $SERVER_PID 2>/dev/null || true
    else
        print_warning "Server test failed. You may need to check your configuration"
        kill $SERVER_PID 2>/dev/null || true
    fi
}

# Main setup function
main() {
    echo "=========================================="
    echo "  WarungChain Backend Setup Script"
    echo "=========================================="
    echo
    
    # Run all setup steps
    check_nodejs
    check_npm
    check_postgresql
    install_dependencies
    setup_environment
    setup_database
    seed_database
    create_uploads_dir
    setup_git_hooks
    
    echo
    echo "=========================================="
    print_success "Setup completed successfully!"
    echo "=========================================="
    echo
    echo "Next steps:"
    echo "1. Edit .env file with your configuration"
    echo "2. Start the development server: npm run dev"
    echo "3. Access the API at: http://localhost:3001"
    echo "4. Check health endpoint: http://localhost:3001/health"
    echo
    echo "Documentation: README.md"
    echo "API Documentation: Available at /api endpoints"
    echo
    
    # Ask if user wants to test the setup
    read -p "Do you want to test the setup now? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        test_setup
    fi
    
    echo
    print_success "Setup script completed!"
}

# Run main function
main "$@" 