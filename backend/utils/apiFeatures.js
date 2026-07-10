class APIFeatures {
  constructor(query, queryStr, searchableFields = []) {
    this.query = query; // Mongoose query
    this.queryStr = queryStr; // req.query
    this.searchableFields = searchableFields;
    this.filterCriteria = {}; // Store filter criteria
  }

  search() {
    const keyword = this.queryStr.keyword 
      ? {
          $or: this.searchableFields.map(field => ({
            [field]: {
              $regex: this.queryStr.keyword,
              $options: 'i'
            }
          }))
        }
      : {};

    // Merge search criteria with filter criteria
    this.filterCriteria = { ...this.filterCriteria, ...keyword };
    return this;
  }

  filter() {
    const queryObj = { ...this.queryStr };
    
    // Fields to exclude from direct filtering
    const excludedFields = ['keyword', 'sort', 'page', 'limit', 'fields', 'role'];
    excludedFields.forEach(el => delete queryObj[el]);

    // Handle advanced filtering for price/date ranges (if needed)
    // Example: { price: { gt: '10' } } -> { price: { $gt: '10' } }
    let queryStr = JSON.stringify(queryObj);
    queryStr = queryStr.replace(/\b(gt|gte|lt|lte)\b/g, match => `$${match}`);

    // Merge with existing filter criteria
    this.filterCriteria = { ...this.filterCriteria, ...JSON.parse(queryStr) };
    return this;
  }

  sort() {
    if (this.queryStr.sort) {
      const sortBy = this.queryStr.sort.split(',').join(' ');
      this.query = this.query.sort(sortBy);
    } else {
      this.query = this.query.sort('-createdAt');
    }
    return this;
  }

  pagination() {
    const page = parseInt(this.queryStr.page, 10) || 1;
    const limit = parseInt(this.queryStr.limit, 10) || 10;
    const skip = (page - 1) * limit;

    // Apply the combined filter criteria once
    this.query = this.query.find(this.filterCriteria).skip(skip).limit(limit);
    return this;
  }
}

module.exports = APIFeatures;
